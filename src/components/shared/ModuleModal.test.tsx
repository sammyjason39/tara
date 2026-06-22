import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";

import { ModuleModal } from "./ModuleModal";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

// A simple test schema
const testSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
});

type TestFormValues = z.infer<typeof testSchema>;

const defaultValues: TestFormValues = { name: "", email: "" };

function renderModal(overrides: Partial<Parameters<typeof ModuleModal<typeof testSchema>>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();

  const result = render(
    <ModuleModal
      schema={testSchema}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
      title="Test Modal"
      isOpen={true}
      {...overrides}
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <input {...field} data-testid="name-input" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <input {...field} data-testid="email-input" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </ModuleModal>
  );

  return { ...result, onSubmit, onCancel };
}

describe("ModuleModal", () => {
  it("renders the modal title and form fields when isOpen is true", () => {
    renderModal();

    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByTestId("name-input")).toBeInTheDocument();
    expect(screen.getByTestId("email-input")).toBeInTheDocument();
  });

  it("does not render content when isOpen is false", () => {
    renderModal({ isOpen: false });

    expect(screen.queryByText("Test Modal")).not.toBeInTheDocument();
  });

  it("shows inline field-level error messages on invalid submission", async () => {
    const user = userEvent.setup();
    renderModal();

    // Submit empty form
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    });
  });

  it("calls onSubmit with valid data", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();

    await user.type(screen.getByTestId("name-input"), "John Doe");
    await user.type(screen.getByTestId("email-input"), "john@example.com");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com",
      });
    });
  });

  it("does not call onSubmit when validation fails", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();

    // Submit without filling fields
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows loading state on submit button during async submission", async () => {
    const user = userEvent.setup();
    let resolveSubmit: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });

    const { onSubmit } = renderModal();
    onSubmit.mockReturnValue(pendingPromise);

    await user.type(screen.getByTestId("name-input"), "John Doe");
    await user.type(screen.getByTestId("email-input"), "john@example.com");
    await user.click(screen.getByRole("button", { name: /save/i }));

    // While submitting, button should show loading text
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });

    // Resolve the promise
    await act(async () => {
      resolveSubmit!();
    });
  });

  it("calls onCancel and discards changes when cancel is clicked", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderModal();

    // Type something then cancel
    await user.type(screen.getByTestId("name-input"), "Unsaved data");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  it("disables cancel button during submission", async () => {
    const user = userEvent.setup();
    let resolveSubmit: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });

    const { onSubmit } = renderModal();
    onSubmit.mockReturnValue(pendingPromise);

    await user.type(screen.getByTestId("name-input"), "John Doe");
    await user.type(screen.getByTestId("email-input"), "john@example.com");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    });

    await act(async () => {
      resolveSubmit!();
    });
  });

  it("renders optional description when provided", () => {
    renderModal({ description: "Fill in the details below" });

    expect(screen.getByText("Fill in the details below")).toBeInTheDocument();
  });
});
