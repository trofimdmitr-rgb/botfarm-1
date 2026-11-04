// Самопроверка: проверки вёрстки действительно ловят поломки (иначе зелёные тесты ничего не значат).
import { expect, test } from "@playwright/test";
import { findProblems } from "./checks";
import { openInTelegram } from "./tg";

test("проверки ловят широкий блок, обрезанную кнопку и ошибку в консоли", async ({ page }, info) => {
  test.skip(info.project.name !== "android-small", "достаточно одного устройства");
  const { errors } = await openInTelegram(page, { user: 990, slug: "nogti-anny" });
  await page.evaluate(() => {
    const page = document.querySelector(".page")!;
    const wide = document.createElement("div");
    wide.style.cssText = "width:600px;height:10px";
    page.appendChild(wide);
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.style.cssText = "width:60px;overflow:hidden;white-space:nowrap";
    btn.textContent = "Очень длинная кнопка записи";
    page.prepend(btn);
    setTimeout(() => {
      throw new Error("тестовая ошибка");
    }, 0);
  });
  await page.waitForTimeout(300);
  const found = await findProblems(page, info, "самопроверка", errors);
  const kinds = new Set(found.map((p) => p.kind));
  expect([...kinds]).toEqual(expect.arrayContaining(["горизонтальная прокрутка", "текст обрезан", "ошибка в консоли"]));
});
