import { Api } from "grammy";
import { config } from "./config.js";

export interface Sender {
  sendMessage(chatId: number, html: string, extra?: Record<string, unknown>): Promise<unknown>;
  sendPhoto(chatId: number, photo: Uint8Array, caption?: string): Promise<{ file_id: string }>;
  /** Файл без пережатия (логотип PNG с прозрачностью). Нет в тестовых заглушках — тогда используем sendPhoto. */
  sendDocument?(chatId: number, file: Uint8Array, filename: string, caption?: string): Promise<{ file_id: string }>;
  setChatMenuButton(chatId: number, text: string, url: string): Promise<unknown>;
}

let override: Sender | null = null;
let api: Api | null = null;

/** Для тестов и локального запуска: перехват отправки сообщений. */
export function setSender(s: Sender | null) {
  override = s;
}

export function rawApi(): Api {
  api ??= new Api(config.botToken);
  return api;
}

/**
 * Отправка сообщений. Отрицательный id — пользователь MAX (см. max.ts): такое сообщение уходит в MAX,
 * кнопки Telegram переводятся в кнопки MAX. Фото всегда хранятся в Telegram (file_id), поэтому фото
 * от мастера из MAX кладём в служебный чат Telegram.
 */
export function tg(): Sender {
  if (override) return override;
  const a = rawApi();
  return {
    sendMessage: async (chatId, html, extra) => {
      if (chatId < 0) {
        const { maxSend, btnsFromTelegram } = await import("./max.js");
        return maxSend(chatId, html, btnsFromTelegram(extra));
      }
      return a.sendMessage(chatId, html, { parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...extra });
    },
    sendPhoto: async (chatId, photo, caption) => {
      const { InputFile } = await import("grammy");
      const target = chatId < 0 ? config.tgStorageChat : chatId;
      if (!target) throw new Error("Некуда сохранить фото: задайте TG_STORAGE_CHAT_ID");
      const msg = await a.sendPhoto(target, new InputFile(photo), { caption });
      const sizes = msg.photo ?? [];
      return { file_id: sizes[sizes.length - 1].file_id };
    },
    sendDocument: async (chatId, file, filename, caption) => {
      const { InputFile } = await import("grammy");
      const target = chatId < 0 ? config.tgStorageChat : chatId;
      if (!target) throw new Error("Некуда сохранить фото: задайте TG_STORAGE_CHAT_ID");
      const msg = await a.sendDocument(target, new InputFile(file, filename), { caption });
      return { file_id: msg.document!.file_id };
    },
    setChatMenuButton: async (chatId, text, url) => {
      if (chatId < 0) return null; // в MAX кнопка мини-аппа настраивается в кабинете бота
      return a.setChatMenuButton({ chat_id: chatId, menu_button: { type: "web_app", text, web_app: { url } } });
    },
  };
}

/** Ошибка «пользователь заблокировал бота / не начинал диалог». */
export function isBlockedError(e: unknown): boolean {
  const err = e as { error_code?: number; description?: string };
  return err?.error_code === 403 || /blocked|chat not found|deactivated|chat\.denied|dialog|not\.found/i.test(err?.description ?? "");
}
