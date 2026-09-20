import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ chats: [] }),
    })
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

test("renders the empty state and loads the chat list", async () => {
  render(<App />);

  expect(screen.getByText(/Hello, I'm Rajinix-AI/i)).toBeInTheDocument();

  await waitFor(() => expect(global.fetch).toHaveBeenCalled());

  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toBe("/api/chats");
  expect(options.headers["x-client-id"]).toEqual(expect.any(String));
});
