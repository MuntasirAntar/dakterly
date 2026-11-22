import { z } from "zod";

export const MAX_CHAT_MESSAGES = 20;
export const MAX_CHAT_MESSAGE_LENGTH = 500;

export const chatLanguageSchema = z.enum(["bn", "en"]);
export const chatRoleSchema = z.enum(["user", "assistant"]);

export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(MAX_CHAT_MESSAGE_LENGTH, `Message must be ${MAX_CHAT_MESSAGE_LENGTH} characters or fewer`),
});

export const chatRequestSchema = z
  .object({
    language: chatLanguageSchema,
    messages: z
      .array(chatMessageSchema)
      .min(1, "At least one message is required")
      .max(MAX_CHAT_MESSAGES, `Conversation is limited to ${MAX_CHAT_MESSAGES} messages`),
  })
  .refine((data) => data.messages[data.messages.length - 1]?.role === "user", {
    message: "The latest message must come from the user",
    path: ["messages"],
  });

export type ValidatedChatRequest = z.infer<typeof chatRequestSchema>;
