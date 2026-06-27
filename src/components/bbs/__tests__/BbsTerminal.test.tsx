import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { BbsProvider } from "@/components/bbs/session/BbsProvider";
import { BbsTerminal } from "@/components/bbs/BbsTerminal";

function renderTerminal() {
  return render(
    <BrowserRouter>
      <BbsProvider>
        <BbsTerminal />
      </BbsProvider>
    </BrowserRouter>
  );
}

describe("BbsTerminal", () => {
  it("renders the main menu and chrome", () => {
    renderTerminal();
    expect(screen.getByText(/MAIN MENU/)).toBeInTheDocument();
    expect(screen.getByText("Message Base")).toBeInTheDocument();
    expect(screen.getByText("File Base")).toBeInTheDocument();
    expect(screen.getByLabelText("BBS command prompt")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: /function keys/i })
    ).toBeInTheDocument();
  });

  it("opens Help with F1 and returns to the menu on Escape", () => {
    renderTerminal();
    fireEvent.keyDown(document.body, { key: "F1" });
    expect(screen.getByText(/KEYS/)).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.getByText(/MAIN MENU/)).toBeInTheDocument();
  });

  it("jumps to a screen with a number hot key", () => {
    renderTerminal();
    fireEvent.keyDown(document.body, { key: "6" });
    expect(screen.getByText(/DOOR GAMES/)).toBeInTheDocument();
  });

  it("navigates via a typed command on the prompt", () => {
    renderTerminal();
    const input = screen.getByLabelText("BBS command prompt");
    fireEvent.change(input, { target: { value: "doors" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText(/DOOR GAMES/)).toBeInTheDocument();
  });

  it("flashes an error for an unknown command", () => {
    renderTerminal();
    const input = screen.getByLabelText("BBS command prompt");
    fireEvent.change(input, { target: { value: "frobnicate" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText(/unknown command/i)).toBeInTheDocument();
  });
});
