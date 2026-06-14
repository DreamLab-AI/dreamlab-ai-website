import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";

// --- Mocks (must be set up before importing Contact) ---
// vi.mock factories are hoisted above all imports, so locals referenced
// inside them must be created via vi.hoisted to be hoisted alongside.
const { insertMock, upsertMock, toastSuccessMock, toastErrorMock } = vi.hoisted(
  () => ({
    insertMock: vi.fn(),
    upsertMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
  })
);

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "contact_submissions") {
        return { insert: insertMock };
      }
      if (table === "email_subscribers") {
        return { upsert: upsertMock };
      }
      return { insert: insertMock, upsert: upsertMock };
    },
  },
}));

// useOGMeta is a side-effect hook; stub it so we don't touch document head.
vi.mock("@/hooks/useOGMeta", () => ({
  useOGMeta: () => undefined,
  default: () => undefined,
}));

// og-meta config object — keep the import resolvable.
vi.mock("@/lib/og-meta", () => ({
  PAGE_OG_CONFIGS: { contact: {} },
  updateOGMetaTags: () => undefined,
}));

// Toast: Contact uses sonner's `toast`. Capture success/error invocations.
vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

// Header pulls in lots of route plumbing; replace with a stub.
vi.mock("@/components/Header", () => ({
  Header: () => null,
}));

import Contact from "../Contact";

// userEvent v14 default export interop; handle both shapes.
// @ts-expect-error - tolerate cjs/esm interop in tests
const ue = userEvent.default ?? userEvent;

const renderContact = () => {
  return render(
    <BrowserRouter>
      <Contact />
    </BrowserRouter>
  );
};

describe("Contact page", () => {
  beforeEach(() => {
    insertMock.mockReset();
    upsertMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
    upsertMock.mockResolvedValue({ error: null });
  });

  it("shows Zod validation errors when submitting an empty form", async () => {
    renderContact();

    const submit = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submit);

    expect(
      await screen.findByText(/name must be at least 2 characters/i)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/please enter a valid email address/i)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/please select a project type/i)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/message must be at least 10 characters/i)
    ).toBeInTheDocument();

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("shows an email-specific error for malformed addresses", async () => {
    renderContact();
    const user = ue.setup();

    await user.type(screen.getByLabelText(/^name$/i), "Alice Tester");
    await user.type(screen.getByLabelText(/^email$/i), "not-an-email");
    await user.selectOptions(
      screen.getByLabelText(/project type/i),
      "consultation"
    );
    await user.type(
      screen.getByLabelText(/^message$/i),
      "This is a sufficiently long enquiry message."
    );

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      await screen.findByText(/please enter a valid email address/i)
    ).toBeInTheDocument();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("calls supabase with form payload on valid submission", async () => {
    renderContact();
    const user = ue.setup();

    await user.type(screen.getByLabelText(/^name$/i), "Alice Tester");
    await user.type(screen.getByLabelText(/^email$/i), "alice@example.com");
    await user.selectOptions(
      screen.getByLabelText(/project type/i),
      "training"
    );
    await user.type(
      screen.getByLabelText(/^message$/i),
      "We would like to enquire about a residential AI agent training cohort."
    );

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));

    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg).toBeInstanceOf(Array);
    expect(insertArg[0]).toMatchObject({
      name: "Alice Tester",
      email: "alice@example.com",
      project_type: "training",
    });
    expect(insertArg[0].message).toMatch(/residential AI agent training/i);

    // Email is also added to subscribers list.
    await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1));
  });

  it("disables the submit button while the request is in flight", async () => {
    // Hold the supabase insert until we resolve manually.
    let resolveInsert: (v: { error: null }) => void = () => undefined;
    insertMock.mockImplementation(
      () =>
        new Promise((res) => {
          resolveInsert = res;
        })
    );

    renderContact();
    const user = ue.setup();

    await user.type(screen.getByLabelText(/^name$/i), "Bob Sender");
    await user.type(screen.getByLabelText(/^email$/i), "bob@example.com");
    await user.selectOptions(
      screen.getByLabelText(/project type/i),
      "development"
    );
    await user.type(
      screen.getByLabelText(/^message$/i),
      "Please advise on bespoke development engagement timelines."
    );

    const submit = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submit);

    // While in flight: button text becomes "Sending..." and button is disabled.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /sending/i })
      ).toBeDisabled();
    });

    // Resolve to let the test exit cleanly.
    resolveInsert({ error: null });
    await waitFor(() => expect(insertMock).toHaveBeenCalled());
  });

  it("renders the contact form with all required fields visible", () => {
    renderContact();
    expect(screen.getByRole("heading", { name: /contact us/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/project type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^message$/i)).toBeInTheDocument();
  });
});
