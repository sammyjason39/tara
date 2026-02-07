export type WorkforceGatewayRequest = {
  tenantId: string;
  endpoint: string;
  payload?: Record<string, unknown>;
};

export type WorkforceGatewayResponse = {
  ok: boolean;
  status: number;
  data?: Record<string, unknown>;
};

export async function sendWorkforceRequest(
  request: WorkforceGatewayRequest,
): Promise<WorkforceGatewayResponse> {
  return {
    ok: true,
    status: 200,
    data: {
      message: "Gateway stub - integrate with external systems later.",
      endpoint: request.endpoint,
    },
  };
}
