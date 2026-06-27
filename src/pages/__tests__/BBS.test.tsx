import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import BBS from "../BBS";

describe("BBS page", () => {
  it("mounts the terminal with the provider", () => {
    render(
      <BrowserRouter>
        <BBS />
      </BrowserRouter>
    );
    expect(
      screen.getByRole("main", { name: /DreamLab BBS terminal/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/MAIN MENU/)).toBeInTheDocument();
  });
});
