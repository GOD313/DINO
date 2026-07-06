# DINO

DINO BotHub + Port Manager + Store Bot + Hiring Bot

این ریپو برای Deploy مستقیم روی Netlify آماده شد.

## نصب روی Netlify
1. Netlify → Add new site → Import an existing project
2. GitHub را انتخاب کن.
3. ریپو `GOD313/DINO` را انتخاب کن.
4. تنظیمات:
   - Build command: خالی
   - Publish directory: `.`
   - Functions directory: `functions`
5. Deploy را بزن.

## اتصال تلگرام اختیاری
در Netlify → Environment variables این دو مقدار را اضافه کن:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## بخش‌های پروژه
- cPanel full package: داخل فایل ZIP نهایی تحویل داده شده.
- Netlify front: همین ریپو.
- BotHub standalone: داخل فایل ZIP نهایی.
- ChatGPT Ads Manager: ماژول آماده اما غیرفعال، چون فعلاً اکانت تبلیغاتی قابل‌دسترسی نبود.

## امنیت
- لاگ شماره تماس در Netlify ماسک می‌شود.
- هیچ توکن واقعی داخل ریپو ذخیره نشده است.
- Ads Manager هیچ کمپین یا هزینه‌ای ایجاد نمی‌کند مگر بعداً با تایید دستی.
