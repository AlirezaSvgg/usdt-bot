const TelegramBot = require("node-telegram-bot-api");

// 👇 توکن جدیدت رو اینجا بذار
const TOKEN = "8701258887:AAFQX--EKlAQV8ZgDHGwoPo5Vn_TZw8CwI8";

const bot = new TelegramBot(TOKEN, { polling: true });

// 👇 اینو بعداً وقتی deploy کردی عوض می‌کنی
const WEBAPP_URL = "http://localhost:3000";

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🚀 USDT Arbitrage Mini App", {
    reply_markup: {
      keyboard: [[
        {
          text: "📊 Open Dashboard",
          web_app: { url: WEBAPP_URL }
        }
      ]],
      resize_keyboard: true
    }
  });
});