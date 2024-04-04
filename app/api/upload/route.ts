import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { MessageCreationStepDetails } from "openai/resources/beta/threads/runs/steps";
import { poll } from "@tmlc/openai-polling";
import { ThreadMessage } from "openai/resources/beta/threads/messages/messages";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const file = await openai.files.create({
      file: await toFile(streamToBlob(req.body!)),
      purpose: "assistants",
    });

    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: "This is my csv file. Go and make my model",
          file_ids: [file.id],
        },
      ],
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID as string,
      model: "gpt-4-turbo-preview",
      tools: [{ type: "code_interpreter" }],
    });

    await poll(openai, thread, run, { showLogs: true });

    const runSteps = await openai.beta.threads.runs.steps.list(
      thread.id,
      run.id
    );

    let filesData = [];

    for (const message of runSteps.data) {
      if (
        (message.step_details as MessageCreationStepDetails)?.message_creation
          ?.message_id
      ) {
        const messageResponse = await openai.beta.threads.messages.retrieve(
          thread.id,
          (message.step_details as MessageCreationStepDetails).message_creation
            .message_id
        );

        for (const fileId of messageResponse.file_ids) {
          const fileContent = await openai.files
            .content(fileId)
            .then((value) => value)
            .catch((error) => {
              console.error("file read error", error);
              return undefined;
            });
          if (!fileContent) {
            console.log("skipping file ", fileId);
            continue;
          }

          const base64String = Buffer.from(
            await fileContent.arrayBuffer()
          ).toString("base64");

          filesData.push({
            fileId: fileId,
            filename: getFilenameFromPath(
              findFilePathById(messageResponse, fileId)
            ),
            content: base64String,
          });
        }
      }
    }

    const stringifiedResponse = JSON.stringify({ files: filesData });

    await openai.files.del(file.id);

    return new Response(stringifiedResponse, {
      headers: {
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error in API:", error);
    return NextResponse.json({ error: "Error" }, { status: 400 });
  }
}

async function streamToBlob(stream: ReadableStream<Uint8Array>): Promise<Blob> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return new Blob(chunks);
}

function getFilenameFromPath(path: string | null): string {
  if (path === null) {
    return "";
  }

  const regex = /[^\/]*$/;
  const matches = path.match(regex);
  return matches ? matches[0] : "";
}

function findFilePathById(
  message: ThreadMessage,
  fileId: string
): string | null {
  for (const item of message.content) {
    if (item.type === "text") {
      for (const annotation of item.text.annotations) {
        if (
          annotation.type === "file_path" &&
          annotation.file_path.file_id === fileId
        ) {
          return annotation.text;
        }
      }
    }
  }
  return null;
}
