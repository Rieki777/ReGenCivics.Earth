  it("Callout inserts an Important blockquote into the body", async () => {
    const onBodyChange = vi.fn();
    render(
      <EmailMarkdownComposer
        subject=""
        body=""
        onSubjectChange={() => {}}
        onBodyChange={onBodyChange}
        variant="application"
      />,
    );
    fireEvent.click(screen.getByTestId("composer-insert-callout"));
    expect(onBodyChange).toHaveBeenCalled();
    const next = onBodyChange.mock.calls.at(-1)?.[0] as string;
    expect(next).toMatch(/> Important: your note here/);
  });
});
