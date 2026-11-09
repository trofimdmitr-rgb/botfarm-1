// Мини-апп в MAX: вход по подписи MAX, запись с HTML-кнопкой (в MAX нет нижней кнопки), отмена через своё окно.
import { expect, test } from "@playwright/test";
import { checkScreen } from "./checks";
import { max, openInMax, settle } from "./tg";

test("MAX: клиент открывает бизнес по ссылке, записывается и отменяет запись", async ({ page }, info) => {
  test.skip(!["iphone-13", "android-small"].includes(info.project.name), "в MAX — два телефона");
  const { errors } = await openInMax(page, { maxUser: 5000 + info.project.name.length, start: "nogti-anny" });
  await expect(page.locator("h1")).toHaveText("Ногти Анны");
  await expect(page.locator("html")).toHaveClass(/max/);
  await checkScreen(page, info, "M1 главная в MAX", errors);

  await page.locator(".tabbar-item", { hasText: "Запись" }).click();
  await page.locator(".g-row").first().click();
  await page.locator(".day").nth(2).click();
  await settle(page, 400);
  await page.locator(".slot").first().click();
  expect((await max.state(page)).back, "кнопка «Назад» MAX показана").toBe(true);
  // в MAX своя кнопка внизу страницы и «Взять номер из MAX»
  await expect(page.locator(".mainbtn-wrap .btn")).toHaveText(/^Записаться на \d\d:\d\d$/);
  await page.getByRole("button", { name: /Взять номер из MAX/ }).click();
  await expect(page.locator("input[type=tel]")).toHaveValue("+7 (927) 123-45-67");
  await checkScreen(page, info, "M2 контакты в MAX", errors);
  await page.locator(".mainbtn-wrap .btn").click();
  await expect(page.getByText("Вы записаны!")).toBeVisible({ timeout: 10_000 });

  await page.locator(".tabbar-item", { hasText: "Мои записи" }).click();
  await page.getByRole("button", { name: "Отменить" }).first().click();
  // своё окно подтверждения вместо системного
  await expect(page.locator(".dlg")).toBeVisible();
  await checkScreen(page, info, "M3 подтверждение отмены", errors);
  await page.locator(".dlg").getByRole("button", { name: "Да" }).click();
  await expect(page.locator(".section", { hasText: "История" })).toBeVisible({ timeout: 10_000 });
});

test("MAX: ссылка «slug__admin» у человека без прав открывает обычную запись, а не панель", async ({ page }, info) => {
  test.skip(info.project.name !== "android-small");
  const { errors } = await openInMax(page, { maxUser: 6001, start: "nogti-anny__admin" });
  await expect(page.locator("h1")).toHaveText("Ногти Анны");
  await expect(page.locator(".admin-name")).toHaveCount(0);
  await checkScreen(page, info, "M4 чужая ссылка на панель", errors);
});
