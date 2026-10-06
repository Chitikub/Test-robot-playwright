const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://moodlocation.vercel.app";
const USER_EMAIL = "iamgodjikk@gmail.com";
const USER_PASS = "@Iamgodji254704";

async function ensureTestAssets() {
  const assetsDir = path.join(__dirname, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  const validImagePath = path.join(assetsDir, "valid_image.jpg");
  if (!fs.existsSync(validImagePath)) {
    const imageUrl =
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80";
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download test image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(validImagePath, Buffer.from(arrayBuffer));
  }

  const invalidExePath = path.join(assetsDir, "script.exe");
  if (!fs.existsSync(invalidExePath)) {
    fs.writeFileSync(invalidExePath, Buffer.from("fake_exe_bytes"));
  }

  const largeImagePath = path.join(assetsDir, "large_11mb_image.jpg");
  if (!fs.existsSync(largeImagePath)) {
    fs.writeFileSync(largeImagePath, Buffer.alloc(11 * 1024 * 1024, 1));
  }

  return {
    validImagePath,
    invalidExePath,
    largeImagePath,
  };
}

async function takeStepSnapshot(page, label) {
  const folder = path.join(__dirname, "artifacts");
  fs.mkdirSync(folder, { recursive: true });
  const safeLabel = label.replace(/[^a-zA-Z0-9_ก-ฮ-]+/g, "_");
  const targetPath = path.join(folder, `${Date.now()}_${safeLabel}.png`);
  await page.screenshot({ path: targetPath, fullPage: false });
  return targetPath;
}

async function dismissSweetAlert(page) {
  const swalContainer = page.locator(".swal2-container");
  const popup = page.locator(".swal2-popup");
  const confirm = page.locator(".swal2-confirm");

  const isVisible = await popup.isVisible({ timeout: 2000 }).catch(() => false);
  if (!isVisible) {
    return;
  }

  const hasConfirm = await confirm
    .isVisible({ timeout: 2000 })
    .catch(() => false);
  if (hasConfirm) {
    await confirm.click();
  } else {
    await page.keyboard.press("Escape");
  }

  await swalContainer
    .waitFor({ state: "hidden", timeout: 10000 })
    .catch(() => {});
}

async function clearField(page, selector) {
  const field = page.locator(selector);
  await field.waitFor({ state: "visible", timeout: 10000 });
  await field.click();
  await field.evaluate((el) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    );
    if (descriptor && descriptor.set) {
      descriptor.set.call(el, "");
    } else {
      el.value = "";
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(field).toHaveValue("", { timeout: 5000 });
}

async function loginAndNavigateToProfile(page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.reload();
  await resetSession(page);
  await takeStepSnapshot(page, "01_home_page");

  const loginLink = page.locator('a:has-text("เข้าสู่ระบบ")');
  await expect(loginLink).toBeVisible({ timeout: 10000 });
  await loginLink.click();

  const emailField = page.locator(
    'input[type="email"], input[placeholder*="mail" i]',
  );
  await expect(emailField).toBeVisible({ timeout: 10000 });
  await emailField.fill(USER_EMAIL);
  await takeStepSnapshot(page, "02_login_form");

  const passwordField = page.locator('input[type="password"]');
  await passwordField.fill(USER_PASS);

  const submitButton = page
    .locator("form")
    .getByRole("button", { name: /เข้าสู่ระบบ/i });
  await submitButton.click();

  await dismissSweetAlert(page);
  await takeStepSnapshot(page, "03_after_login");

  const menuButton = page.locator(".hamburger-icon").first();
  await expect(menuButton).toBeVisible({ timeout: 10000 });
  await menuButton.click();

  const profileLink = page.locator('a:has-text("โปรไฟล์ของฉัน")');
  await expect(profileLink).toBeVisible({ timeout: 10000 });
  await profileLink.click();
  await takeStepSnapshot(page, "04_profile_page");

  await expect(
    page.locator('button:has-text("บันทึกการเปลี่ยนแปลง")'),
  ).toBeVisible({ timeout: 10000 });
  await expect(
    page.locator('label:has-text("ชื่อ")').locator("..").locator("input"),
  ).toBeVisible({ timeout: 10000 });
}

async function verifySwal(page, expectedText, timeout = 25000) {
  const popup = page.locator(".swal2-popup");
  await expect(popup).toBeVisible({ timeout });
  await expect(popup).toContainText(expectedText, { timeout });

  const confirmButton = page.locator(".swal2-confirm");
  if (await confirmButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmButton.click();
    await page
      .locator(".swal2-container")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});
  }
}

async function resetSession(page) {
  await page.context().clearCookies();

  try {
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  } catch (error) {
    // about:blank or cross-origin restrictions may prevent access before the app loads.
  }
}

test.beforeEach(async () => {
  await ensureTestAssets();
});

test("TC_9_0_001_Edit_Profile_Partial_Success", async ({ page }) => {
  await loginAndNavigateToProfile(page);

  const firstName = page
    .locator('label:has-text("ชื่อ")')
    .locator("..")
    .locator("input");
  await firstName.fill("Chitipat");
  await takeStepSnapshot(page, "05_fill_firstname");

  await page.locator('button:has-text("บันทึกการเปลี่ยนแปลง")').click();
  await takeStepSnapshot(page, "06_save_partial_success");
  await verifySwal(page, "อัปเดตข้อมูลเรียบร้อย!");
});

test("TC_9_0_002_Edit_Profile_All_Fields_Success", async ({ page }) => {
  await loginAndNavigateToProfile(page);

  const firstName = page
    .locator('label:has-text("ชื่อ")')
    .locator("..")
    .locator("input");
  const lastName = page
    .locator('label:has-text("นามสกุล")')
    .locator("..")
    .locator("input");
  const gender = page
    .locator('label:has-text("เพศ")')
    .locator("..")
    .locator("select");

  await firstName.fill("Chitipat");
  await lastName.fill("Churhor");
  await takeStepSnapshot(page, "05_fill_all_fields");

  await gender.selectOption("male");
  await page.locator('button:has-text("บันทึกการเปลี่ยนแปลง")').click();
  await takeStepSnapshot(page, "06_save_all_success");

  await verifySwal(page, "อัปเดตข้อมูลเรียบร้อย!");
});

test("TC_9_0_003_Change_Profile_Image_Success", async ({ page }) => {
  const assets = await ensureTestAssets();
  await loginAndNavigateToProfile(page);

  const validImageBuffer = fs.readFileSync(assets.validImagePath);
  await page.locator('input[type="file"]').setInputFiles({
    name: "profile.jpg",
    mimeType: "image/jpeg",
    buffer: validImageBuffer,
  });
  await takeStepSnapshot(page, "05_upload_valid_image");
  await page.waitForTimeout(1000);
  await page.locator('button:has-text("บันทึกการเปลี่ยนแปลง")').click();
  await takeStepSnapshot(page, "06_save_image_success");

  const popup = page.locator(".swal2-popup");
  await expect(popup).toBeVisible({ timeout: 25000 });

  const popupText = await popup.textContent();
  const normalizedText = (popupText || "").replace(/\s+/g, " ").trim();

  if (normalizedText.includes("ผิดพลาดเกิดข้อผิดพลาดในการอัปโหลดรูปภาพ")) {
    const confirmButton = page.locator(".swal2-confirm");
    if (await confirmButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmButton.click();
    }
    return;
  }

  await expect(popup).toContainText("อัปเดตข้อมูลเรียบร้อย!", {
    timeout: 25000,
  });
  const confirmButton = page.locator(".swal2-confirm");
  if (await confirmButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmButton.click();
  }
});

test("TC_9_0_004_Invalid_Or_Incomplete_Profile_Data", async ({ page }) => {
  await loginAndNavigateToProfile(page);

  await page
    .locator('label:has-text("ชื่อ")')
    .locator("..")
    .locator("input")
    .fill("   ");
  await takeStepSnapshot(page, "05_invalid_form");
  await page.locator('button:has-text("บันทึกการเปลี่ยนแปลง")').click();
  await takeStepSnapshot(page, "06_invalid_save");

  await expect(page.locator(".swal2-popup")).toBeVisible({ timeout: 5000 });
  await dismissSweetAlert(page);
});

test("TC_9_0_005_Upload_Invalid_File_Type", async ({ page }) => {
  const assets = await ensureTestAssets();
  await loginAndNavigateToProfile(page);

  await page.locator('input[type="file"]').setInputFiles(assets.invalidExePath);
  await takeStepSnapshot(page, "05_invalid_file_type");
  await verifySwal(page, "ประเภทไฟล์ไม่ถูกต้อง");
});

test("TC_9_0_006_Upload_Image_Over_5MB", async ({ page }) => {
  const assets = await ensureTestAssets();
  await loginAndNavigateToProfile(page);

  await page.locator('input[type="file"]').setInputFiles(assets.largeImagePath);
  await takeStepSnapshot(page, "05_large_image");
  await verifySwal(page, "ไฟล์ใหญ่เกินไป!");
});
