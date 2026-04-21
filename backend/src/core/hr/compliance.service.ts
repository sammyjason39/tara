import { Injectable, Logger } from "@nestjs/common";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { UploadComplianceDocumentDto } from "./dto/upload-compliance-document.dto";
import { EventBusService } from "../../shared/events/event-bus.service";
import { OcrService } from "./ocr.service";
import { AuditService } from "../../shared/audit/audit.service";
import { NotificationService } from "../../shared/comms/notification.service";

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly repository: IHRRepository,
    private readonly eventBus: EventBusService,
    private readonly ocrService: OcrService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async uploadDocument(tenant_id: string, dto: UploadComplianceDocumentDto, user_id: string) {
    this.logger.log(`Uploading compliance document for employee ${dto.employee_id}`);

    const doc = await this.repository.uploadComplianceDocument(tenant_id, dto);

    await this.eventBus.publish({
      event_type: "compliance.document_uploaded",
      tenant_id,
      entity_id: doc.id,
      entity_type: "COMPLIANCE_DOCUMENT",
      source_module: "HR",
      user_id,
      payload: {
        employee_id: doc.employee_id,
        documentType: doc.documentType,
      },
    });

    return doc;
  }

  async uploadAndClassify(tenant_id: string, employee_id: string, fileData: any) {
    this.logger.log(`Uploading and auto-classifying document for employee ${employee_id}`);

    const ocrResult = await this.ocrService.extractData(fileData.fileUrl, fileData.documentType || "UNKNOWN");
    
    const doc = await this.repository.uploadComplianceDocument(tenant_id, {
      employee_id,
      documentType: fileData.documentType || "OTHER",
      documentNumber: ocrResult.fields.document_number || `SIM-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      fileUrl: fileData.fileUrl,
      expiryDate: ocrResult.fields.expiry_date ? new Date(ocrResult.fields.expiry_date) : null,
      metadata: {
        ocrConfidence: ocrResult.confidence,
        ocrExtracted: ocrResult.fields,
        autoClassified: true,
      },
    });

    // Cache in employee metadata
    const employee = await this.repository.getEmployeeById(tenant_id, employee_id);
    if (employee) {
      const currentMetadata = (employee as any).documents_metadata || {};
      await this.repository.updateEmployee(tenant_id, employee_id, {
        documents_metadata: {
          ...currentMetadata,
          [doc.documentType]: {
            lastVerifiedAt: new Date(),
            ocrConfidence: ocrResult.confidence,
            status: "AUTO_CLASSIFIED",
          }
        }
      });
    }

    return doc;
  }

  async verifyDocument(tenant_id: string, id: string, verified_by: string, status: string) {
    this.logger.log(`Verifying compliance document ${id} with status ${status}`);

    const doc = await this.repository.verifyDocument(tenant_id, id, verified_by, status);

    await this.eventBus.publish({
      event_type: "compliance.document_verified",
      tenant_id,
      entity_id: doc.id,
      entity_type: "COMPLIANCE_DOCUMENT",
      source_module: "HR",
      user_id: verified_by,
      payload: {
        employee_id: doc.employee_id,
        status: doc.verification_status,
      },
    });

    return doc;
  }

  async checkExpirations(tenant_id: string) {
    const documents = await this.repository.getGlobalComplianceStatus(tenant_id);
    const now = new Date();
    const expiredDocs = documents.filter(
      (d: any) => d.expiryDate && new Date(d.expiryDate) < now && d.verification_status !== "EXPIRED",
    );

    for (const doc of expiredDocs) {
      this.logger.warn(`Document ${doc.id} for employee ${doc.employee_id} has expired`);
      await this.repository.verifyDocument(tenant_id, doc.id, "SYSTEM", "EXPIRED");
      
      // CRITICAL: Log to global audit chain
      await this.auditService.log({
        tenant_id,
        user_id: "SYSTEM",
        module: "HR",
        action: "DOCUMENT_EXPIRED",
        entity_type: "COMPLIANCE_DOCUMENT",
        entity_id: doc.id,
        metadata: {
          employee_id: doc.employee_id,
          documentType: doc.documentType,
          severity: "HIGH",
        },
      });

      // Notify HR Manager / Owner
      await this.notificationService.createNotification({
        tenant_id,
        user_id: "SYSTEM", // Broadcast or find specific HR manager
        title: "Compliance Alert: Document Expired",
        message: `The ${doc.documentType} for employee ${doc.employee_id} has expired. Immediate action required.`,
        type: "COMPLIANCE_ALERT",
        priority: "HIGH",
        event_reference_id: doc.id,
      });

      await this.eventBus.publish({
        event_type: "compliance.document_expired",
        tenant_id,
        entity_id: doc.id,
        entity_type: "COMPLIANCE_DOCUMENT",
        source_module: "HR",
        user_id: "SYSTEM",
        payload: {
          employee_id: doc.employee_id,
          documentType: doc.documentType,
        },
      });
    }

    return expiredDocs.length;
  }

  async auditCompliance(tenant_id: string) {
    this.logger.log(`Running global compliance audit for tenant ${tenant_id}`);

    const allDocs = await this.repository.getGlobalComplianceStatus(tenant_id);
    const now = new Date();
    
    const auditResults = {
      totalDocuments: allDocs.length,
      expired: 0,
      expiringSoon: 0, // next 30 days
      pendingVerification: 0,
      criticalAlerts: [],
    };

    for (const doc of allDocs) {
      if (doc.verification_status === 'PENDING') {
        auditResults.pendingVerification++;
      }

      if (doc.expiryDate) {
        const expiry = new Date(doc.expiryDate);
        const daysToExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysToExpiry <= 0) {
          auditResults.expired++;
          (auditResults.criticalAlerts as any[]).push({
            id: doc.id,
            employee_id: doc.employee_id,
            type: doc.documentType,
            issue: 'EXPIRED',
          });
        } else if (daysToExpiry <= 30) {
          auditResults.expiringSoon++;
        }
      }
    }

    return auditResults;
  }

  async triggerOcr(tenant_id: string, documentId: string, user_id: string) {
    this.logger.log(`Triggering OCR for document ${documentId}`);

    const docs = await this.repository.getGlobalComplianceStatus(tenant_id);
    const doc = docs.find((d: any) => d.id === documentId);
    if (!doc) throw new Error("Document not found");

    const ocrResult = await this.ocrService.extractData(doc.fileUrl, doc.documentType);

    // Update document with OCR results in metadata
    const updated = await this.repository.verifyDocument(tenant_id, documentId, "OCR_ENGINE", doc.verification_status, {
      ...((doc as any).metadata || {}),
      ocr_extraction: ocrResult,
    });

    await this.eventBus.publish({
      event_type: "compliance.ocr_completed",
      tenant_id,
      entity_id: doc.id,
      entity_type: "COMPLIANCE_DOCUMENT",
      source_module: "HR",
      user_id,
      payload: {
        confidence: ocrResult.confidence,
        extractedFields: ocrResult.fields,
      },
    });

    // Cache results in employee document metadata
    const employee = await this.repository.getEmployeeById(tenant_id, doc.employee_id);
    if (employee) {
      const currentMetadata = (employee as any).documents_metadata || {};
      await this.repository.updateEmployee(tenant_id, doc.employee_id, {
        documents_metadata: {
          ...currentMetadata,
          [doc.documentType]: {
            lastOcrAt: new Date(),
            ocrConfidence: ocrResult.confidence,
            fields: ocrResult.fields,
          }
        }
      });
    }

    return updated;
  }
}
