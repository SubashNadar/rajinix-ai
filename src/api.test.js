import { streamMessage } from "./api";

// Feeds the given strings through a minimal ReadableStream reader stand-in.
function mockStreamResponse(chunks) {
  const encoder = new TextEncoder();
  let index = 0;

  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: () =>
          Promise.resolve(
            index < chunks.length
              ? { value: encoder.encode(chunks[index++]), done: false }
              : { value: undefined, done: true }
          ),
      }),
    },
  };
}

afterEach(() => {
  jest.resetAllMocks();
});

test("assembles deltas from SSE frames, including ones split across chunks", async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve(
      mockStreamResponse([
        'event: start\ndata: {"chatId":"abc"}\n\nevent: delta\ndata: {"text":"Hello"}\n\n',
        'event: delta\ndata: {"text":" wo', // frame deliberately cut mid-payload
        'rld"}\n\nevent: done\ndata: {"text":"Hello world"}\n\n',
      ])
    )
  );

  const deltas = [];
  const answer = await streamMessage("abc", "hi", {
    onDelta: (text) => deltas.push(text),
  });

  expect(deltas).toEqual(["Hello", " world"]);
  expect(answer).toBe("Hello world");
});

test("throws when the stream reports an error event", async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve(
      mockStreamResponse(['event: error\ndata: {"error":"Gemini exploded"}\n\n'])
    )
  );

  await expect(streamMessage("abc", "hi", {})).rejects.toThrow("Gemini exploded");
});

test("surfaces a non-OK response body as an error", async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      json: () => Promise.resolve({ error: "Too many requests. Please slow down." }),
    })
  );

  await expect(streamMessage("abc", "hi", {})).rejects.toThrow(
    "Too many requests. Please slow down."
  );
});
