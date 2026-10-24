import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FormattedText from "./FormattedText";

describe("FormattedText", () => {
  it("turns **bold** into <strong> and keeps the rest as text", () => {
    const { container } = render(<FormattedText text={"Try **I statements**. Then **listen**.\nDone"} />);
    expect([...container.querySelectorAll("strong")].map((s) => s.textContent)).toEqual(["I statements", "listen"]);
    expect(container.textContent).toBe("Try I statements. Then listen.\nDone");
  });

  it("never interprets HTML from the model", () => {
    const { container } = render(<FormattedText text={'<img src=x onerror="alert(1)"> **<b>hi</b>**'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<img src=x");
    expect(container.querySelector("strong")?.textContent).toBe("<b>hi</b>");
  });

  it("leaves unmatched or multi-line markers alone", () => {
    const { container } = render(<FormattedText text={"a ** b and **c\nd**"} />);
    expect(container.querySelector("strong")).toBeNull();
    expect(container.textContent).toBe("a ** b and **c\nd**");
  });
});
