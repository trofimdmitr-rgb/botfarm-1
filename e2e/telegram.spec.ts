// Автотесты «как мини-апп ощущается в Telegram»: проходим путь клиента, мастера и суперадмина
// на разных телефонах, в светлой и тёмной теме, и проверяем вёрстку на каждом экране (см. checks.ts).
import { expect, test } from "@playwright/test";
import { checkScreen } from "./checks";
import { openInTelegram, settle, tg, type Platform, type Theme } from "./tg";

const platformOf = (name: string): Platform => (name.startsWith("iphone") ? "ios" : name.startsWith("desktop") ? "tdesktop" : "android");

// каждый тест — свой пользователь, чтобы записи не пересекались
let uid = 100;
const nextUser = (seed: number) => 1000 + seed * 50 + uid++;

for (const theme of ["light", "dark"] as Theme[]) {
  test.describe(`тема: ${theme}`, () => {
    test("клиент: главная с баннером → работы → запись → мои записи → отмена", async ({ page }, info) => {
      const platform = platformOf(info.project.name);
      const user = nextUser(info.project.name.length + (theme === "dark" ? 7 : 0));
      const { errors } = await openInTelegram(page, { user, slug: "nogti-anny", theme, platform });

      await expect(page.locator("h1")).toHaveText("Ногти Анны");
      await expect(page.locator(".tabbar")).toBeVisible();
      await checkScreen(page, info, "01 главная", errors);

      // раскрыть прайс
      await page.locator(".home-price button", { hasText: "Все" }).click();
      await checkScreen(page, info, "02 главная — весь прайс", errors);

      // работы и фото крупно
      await page.locator(".tabbar-item", { hasText: "Работы" }).click();
      await expect(page.locator(".gallery-item")).toHaveCount(6);
      await checkScreen(page, info, "03 работы", errors);
      await page.locator(".gallery-item").nth(1).click();
      await expect(page.locator(".lightbox")).toBeVisible();
      await checkScreen(page, info, "04 фото крупно", errors);
      await page.locator(".lightbox").click({ position: { x: 10, y: 60 } });
      await expect(page.locator(".lightbox")).toHaveCount(0);

      // запись через вкладку
      await page.locator(".tabbar-item", { hasText: "Запись" }).click();
      await checkScreen(page, info, "05 запись — услуга", errors);
      await page.locator(".cell-tap").first().click();
      await expect(page.locator(".slot").first()).toBeVisible();
      await checkScreen(page, info, "06 запись — время", errors);
      // второй день, первое свободное время
      await page.locator(".day").nth(1).click();
      await settle(page, 400);
      await page.locator(".slot").first().click();
      await expect(page.locator("input[type=tel]")).toBeVisible();
      let st = await tg.state(page);
      expect(st.main.visible, "кнопка Telegram «Записаться на …» показана").toBe(true);
      expect(st.main.text).toMatch(/^Записаться на \d\d:\d\d$/);
      expect(st.back, "кнопка «Назад» Telegram показана").toBe(true);
      await checkScreen(page, info, "07 запись — контакты", errors);

      // неверный номер — ошибка под полем, запись не создаётся
      await page.locator("input[type=tel]").fill("");
      await page.locator("input[type=tel]").pressSequentially("89999999999");
      await tg.clickMain(page);
      await expect(page.locator(".field-error")).toBeVisible();
      await checkScreen(page, info, "08 запись — неверный номер", errors);

      await page.locator("input[type=tel]").fill("");
      await page.locator("input[type=tel]").pressSequentially("89271234567");
      await expect(page.locator("input[type=tel]")).toHaveValue("+7 (927) 123-45-67");
      await tg.clickMain(page);
      await expect(page.getByText("Вы записаны!")).toBeVisible({ timeout: 10_000 });
      st = await tg.state(page);
      expect(st.main.visible, "на экране «Вы записаны» нет лишней кнопки Telegram").toBe(false);
      await checkScreen(page, info, "09 вы записаны", errors);

      // мои записи и отмена (подтверждение Telegram отвечает «да»)
      await page.locator(".tabbar-item", { hasText: "Мои записи" }).click();
      await expect(page.locator(".section", { hasText: "Предстоящие" })).toBeVisible();
      await checkScreen(page, info, "10 мои записи", errors);
      await page.locator(".section", { hasText: "Предстоящие" }).getByRole("button", { name: "Отменить" }).first().click();
      await expect(page.locator(".section", { hasText: "История" })).toBeVisible({ timeout: 10_000 });
      await checkScreen(page, info, "11 после отмены", errors);

      // главная: ближайшей записи больше нет, панель на месте
      await page.locator(".tabbar-item", { hasText: "Главная" }).click();
      await expect(page.locator(".home-next")).toHaveCount(0);
      await checkScreen(page, info, "12 главная снова", errors);
    });

    test("клиент: бизнес без баннера и без работ", async ({ page }, info) => {
      const { errors } = await openInTelegram(page, { user: nextUser(3), slug: "barbershop-boroda", theme, platform: platformOf(info.project.name) });
      await expect(page.locator("h1")).toHaveText("Барбершоп Борода");
      await expect(page.locator(".tabbar-item", { hasText: "Работы" })).toHaveCount(0);
      await checkScreen(page, info, "21 главная без баннера", errors);
      // у барбершопа несколько мастеров: услуга из прайса → выбор мастера → время
      await page.locator(".price-row").first().click();
      await expect(page.locator(".cell-tap", { hasText: "Любой свободный" })).toBeVisible();
      await checkScreen(page, info, "22 выбор мастера", errors);
      await page.locator(".cell-tap", { hasText: "Алексей" }).click();
      await expect(page.locator(".slot, .empty").first()).toBeVisible();
      await checkScreen(page, info, "23 время у мастера", errors);
      expect(await tg.clickBack(page), "назад к выбору мастера").toBe(true);
      await expect(page.locator(".cell-tap", { hasText: "Любой свободный" })).toBeVisible();
      expect(await tg.clickBack(page), "назад на главную").toBe(true);
      await expect(page.locator("h1")).toHaveText("Барбершоп Борода");
    });

    test("мастер: панель управления по всем вкладкам", async ({ page }, info) => {
      const { errors } = await openInTelegram(page, { user: 2, slug: "nogti-anny", view: "admin", theme, platform: platformOf(info.project.name) });
      await expect(page.locator(".admin-name")).toHaveText("Ногти Анны");
      for (const tab of ["Записи", "Услуги", "График", "Ещё"]) {
        await page.locator(".tab", { hasText: tab }).click();
        await checkScreen(page, info, `31 панель — ${tab}`, errors);
      }
      const subs = ["Ссылка для клиентов и QR", "Настройки и тексты", "Мастера", "Портфолио", "Клиенты", "Рассылка клиентам", "Администраторы"];
      for (const [i, sub] of subs.entries()) {
        await page.locator(".tab", { hasText: "Ещё" }).click();
        await page.locator(".cell", { hasText: sub }).first().click();
        await checkScreen(page, info, `32.${i + 1} панель — ${sub}`, errors);
        expect(await tg.clickBack(page), `назад из «${sub}»`).toBe(true);
        await expect(page.locator(".admin-name")).toBeVisible();
      }
    });

    test("суперадмин: панель платформы", async ({ page }, info) => {
      const { errors } = await openInTelegram(page, { user: 1, view: "super", theme, platform: platformOf(info.project.name) });
      await expect(page.getByRole("heading", { name: "Платформа" })).toBeVisible();
      await checkScreen(page, info, "41 платформа", errors);
    });
  });
}
