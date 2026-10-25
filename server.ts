import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI if API key exists
const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Fallback smart Bengali response generator
function generateLocalBengaliReply(params: {
  productName: string;
  price: number;
  description: string;
  stock: number;
  inquiryType: string;
  customerQuery?: string;
  shopName?: string;
}) {
  const { productName, price, description, stock, inquiryType, customerQuery, shopName = 'আমাদের শপ' } = params;
  const stockText = stock > 0 ? `বর্তমানে স্টক রয়েছে (${stock} টি অ্যাভেইলেবল)` : `স্টক শেষ হতে চলেছে`;
  const lowerQuery = (customerQuery || '').toLowerCase().trim();

  // Smart Banglish & Bengali query intent detection (Prioritize specific keywords over generic words)
  let detectedType = inquiryType;
  if (customerQuery) {
    if (
      lowerQuery.includes('delivery') ||
      lowerQuery.includes('charge') ||
      lowerQuery.includes('delivary') ||
      lowerQuery.includes('dhaka') ||
      lowerQuery.includes('kuriar') ||
      lowerQuery.includes('ডেলিভারি') ||
      lowerQuery.includes('চার্জ') ||
      lowerQuery.includes('কুরিয়ার') ||
      lowerQuery.includes('ঢাকা')
    ) {
      detectedType = 'delivery_rules';
    } else if (
      lowerQuery.includes('discount') ||
      lowerQuery.includes('kom') ||
      lowerQuery.includes('komano') ||
      lowerQuery.includes('offer') ||
      lowerQuery.includes('ডিসকাউন্ট') ||
      lowerQuery.includes('কম') ||
      lowerQuery.includes('অফার')
    ) {
      detectedType = 'discount_query';
    } else if (
      lowerQuery.includes('stock') ||
      lowerQuery.includes('ache') ||
      lowerQuery.includes('available') ||
      lowerQuery.includes('পাব') ||
      lowerQuery.includes('স্টক') ||
      lowerQuery.includes('আছে')
    ) {
      detectedType = 'stock_check';
    } else if (
      lowerQuery.includes('order') ||
      lowerQuery.includes('kinbo') ||
      lowerQuery.includes('form') ||
      lowerQuery.includes('kivabe') ||
      lowerQuery.includes('নিতে চাই') ||
      lowerQuery.includes('অর্ডার') ||
      lowerQuery.includes('ঠিকানা')
    ) {
      detectedType = 'order_form';
    } else if (
      lowerQuery.includes('dam') ||
      lowerQuery.includes('daam') ||
      lowerQuery.includes('price') ||
      lowerQuery.includes('koto') ||
      lowerQuery.includes('দাম') ||
      lowerQuery.includes('টাকা') ||
      lowerQuery.includes('মূল্য')
    ) {
      detectedType = 'price_and_details';
    }
  }

  switch (detectedType) {
    case 'price_and_details':
      return `আসসালামু আলাইকুম প্রিয় কাস্টমার! 🌸
আমাদের "${productName}" এর মূল্য মাত্র ৳${price} টাকা।

পণ্য বিবরণ:
${description}

✅ পণ্যের বর্তমান অবস্থা: ${stockText}
🚚 ডেলিভারি চার্জ:
- ঢাকার ভিতরে: ৳৭০ টাকা
- ঢাকার বাইরে: ৳১৩০ টাকা

অর্ডার করতে চাইলে আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা মেসেজে পাঠিয়ে দিন। ধন্যবাদ! 😊`;

    case 'delivery_rules':
      return `আসসালামু আলাইকুম! 🚚
আমাদের দেশজুড়ে দ্রুততম হোম ডেলিভারি সুবিধা রয়েছে:

📍 ঢাকার ভিতরে: মাত্র ৳৭০ টাকা (২৪ থেকে ৪৮ ঘণ্টার মধ্যে ডেলিভারি)
📍 ঢাকার বাইরে: মাত্র ৳১৩০ টাকা (২ থেকে ৩ কার্যদিবসের মধ্যে ডেলিভারি)

পণ্য হাতে পেয়ে চেক করে ক্যাশ অন ডেলিভারিতে টাকা পরিশোধ করতে পারবেন। "${productName}" (মূল্য ৳${price}) অর্ডার করতে এখনি আপনার ঠিকানা ও ফোন নম্বর দিন। ধন্যবাদ! ✨`;

    case 'order_form':
      return `সম্মানিত কাস্টমার, অর্ডার কনফার্ম করতে নিচের তথ্যগুলো লিখে পাঠান: 📝

১. আপনার পুরো নাম:
২. মোবাইল নম্বর:
৩. সম্পূর্ণ ডেলিভারি ঠিকানা (জেলা ও থানা সহ):
৪. পণ্যের নাম ও সংখ্যা: ${productName} (৳${price})

📦 ডেলিভারি চার্জ: ঢাকার ভিতরে ৳৭০ / ঢাকার বাইরে ৳১৩০।
তথ্যগুলো পাওয়া মাত্রই আমরা আপনার অর্ডারটি কনফার্ম করে দ্রুত পাঠিয়ে দিব। ইনশাআল্লাহ! ❤️`;

    case 'discount_query':
      return `আসসালামু আলাইকুম প্রিয় গ্রাহক! 😊
আমাদের "${productName}" এর গুণগত মান ও কোয়ালিটি বিবেচনায় ৳${price} টাকা একদম রিজনেবল ও ফিক্সড প্রাইজ রাখা হয়েছে।

আমরা কোয়ালিটি এবং দ্রুত সার্ভিসে কোন ছাড় দেই না। পণ্য হাতে পাওয়ার পর ১০০% সন্তুষ্ট হবেন ইনশাআল্লাহ। আপনার অর্ডারটি কি কনফার্ম করে দেব? 🛍️`;

    case 'stock_check':
      return `আসসালামু আলাইকুম! 📦
জি হ্যাঁ, "${productName}" এখনো আমাদের স্টকে রয়েছে (${stockText})।

বর্তমান মূল্য: ৳${price} টাকা।
স্টক সীমিত হওয়ার কারণে দ্রুত অর্ডার কনফার্ম করে রাখা ভালো। ঢাকার ভিতরে ডেলিভারি চার্জ ৳৭০ এবং বাইরে ৳১৩০। এখনই অর্ডার করতে আপনার ঠিকানা ও ফোন নম্বর মেসেজ করুন! 🌸`;

    case 'custom':
    default:
      return `আসসালামু আলাইকুম! আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ। 🌸

আপনি "${productName}" (মূল্য: ৳${price} টাকা) সম্পর্কে জানতে চেয়েছেন:
${customerQuery ? `আপনার প্রশ্ন: "${customerQuery}"\n\n` : ''}পণ্য বিবরণ: ${description}

🚚 ডেলিভারি চার্জ: ঢাকার ভিতরে ৳৭০ টাকা, ঢাকার বাইরে ৳১৩০ টাকা।
অর্ডার করতে আপনার নাম, মোবাইল নম্বর ও ডেলিভারি ঠিকানা লিখে পাঠিয়ে দিন। যেকোনো প্রয়োজনে আমরা পাশে আছি! ধন্যবাদ। 💖`;
  }
}

// In-memory cache and cooldown to respect Gemini free tier limits (5 req/min)
const replyCache = new Map<string, { reply: string; timestamp: number }>();
let geminiRateLimitedUntil = 0;

// API endpoint for generating Bengali replies
app.post('/api/generate-reply', async (req, res) => {
  try {
    const { productName, price, description, stock, inquiryType, customerQuery, tone, shopName } = req.body;

    if (!productName) {
      return res.status(400).json({ error: 'পণ্যের নাম প্রয়োজন।' });
    }

    const cacheKey = `${productName}:${price}:${inquiryType || 'general'}:${(customerQuery || '').trim()}`;
    const cached = replyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      // Return cached response within 5 minutes
      return res.json({
        success: true,
        reply: cached.reply,
        source: 'cache',
      });
    }

    const ai = getGenAI();
    const isCooldownActive = Date.now() < geminiRateLimitedUntil;

    // If Gemini API is available and not in rate-limit cooldown
    if (ai && !isCooldownActive) {
      try {
        const systemPrompt = `You are an expert Bangladeshi online reseller assistant (F-Commerce Facebook Messenger customer support) named "Bangla Resell AI".
Your task is to write polite, warm, persuasive, and completely professional customer reply messages in fluent BENGALI (বাংলা ভাষা).

CRITICAL RULES:
1. Always write in natural, friendly, respectful Bengali (বাংলা). Use respectful terms like "আসসালামু আলাইকুম", "প্রিয় কাস্টমার", "ধন্যবাদ".
2. Customers may speak or write in Bengali script (e.g. "দাম কত?", "ডেলিভারি চার্জ কত?") OR in Banglish / Roman Bengali (e.g. "dam koto bhai", "delivery charge koto", "dhakar baire charge koto", "order korte chai", "stock ache kina"). You must effortlessly understand both Bengali and Banglish questions.
3. Always respond in pure, polite BENGALI script (বাংলা ভাষা).
4. Use the provided product information accurately:
   - Product Name: ${productName}
   - Product Price: ৳${price} টাকা
   - Description: ${description || 'উচ্চমানের সেরা পণ্য'}
   - Stock: ${stock} items
   - Delivery fee rules: ঢাকার ভিতরে ৭০ টাকা, ঢাকার বাইরে ১৩০ টাকা। Cash on Delivery available.
5. Keep the reply clean, nicely formatted with bullet points and friendly emojis (🌸, 🚚, 📦, ৳, 😊).
6. Make it ready to be directly copied and pasted into Facebook Messenger.
7. Never hallucinate facts outside the product information. Tone: ${tone || 'Polite & Friendly'}.
8. Do NOT output english explanations. Return ONLY the Bengali message text.`;

        const userPrompt = `Customer voice/text inquiry:
${customerQuery ? `Query: "${customerQuery}"` : `Inquiry type: ${inquiryType || 'general'}`}

Generate a polished Bengali Facebook Messenger reply for the product "${productName}" priced at ৳${price} taka. Include delivery charges (Dhaka 70, outside 130 taka) and a clear call to action to order.`;

        // 5 second timeout race
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('AI timeout')), 5000)
        );

        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
          },
        });

        const response = (await Promise.race([geminiPromise, timeoutPromise])) as any;

        const replyText = response?.text?.trim();
        if (replyText) {
          replyCache.set(cacheKey, { reply: replyText, timestamp: Date.now() });
          return res.json({
            success: true,
            reply: replyText,
            source: 'gemini',
          });
        }
      } catch (geminiError: any) {
        // If 429 quota exceeded, initiate 45-second cooldown without re-spamming
        const errStr = String(geminiError?.message || geminiError || '');
        if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('Quota')) {
          geminiRateLimitedUntil = Date.now() + 45000;
        }
        // Fall back quietly to local generator
      }
    }

    // Fallback: rule-based intelligent Bengali reply
    const fallbackReply = generateLocalBengaliReply({
      productName,
      price: Number(price) || 0,
      description: description || 'অসাধারণ মানের সেরা কালেকশন।',
      stock: Number(stock) || 0,
      inquiryType: inquiryType || 'custom',
      customerQuery,
      shopName,
    });

    replyCache.set(cacheKey, { reply: fallbackReply, timestamp: Date.now() });

    return res.json({
      success: true,
      reply: fallbackReply,
      source: 'local',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'রিপ্লাই তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
      details: error?.message,
    });
  }
});

// Audio transcription endpoint (using gemini-3.5-transcribe if audio file/blob is sent)
app.post('/api/transcribe-voice', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'অডিও ডাটা পাওয়া যায়নি।' });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(400).json({ error: 'AI ট্রান্সক্রিপশন সার্ভিস বর্তমানে অফলাইনে আছে।' });
    }

    const audioPart = {
      inlineData: {
        mimeType: mimeType,
        data: audioData,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          {
            text: 'Transcribe this voice recording. The speaker may speak in Bengali (বাংলা) or Banglish (Bengali with English words/phonetics like "dam koto", "delivery charge koto"). Transcribe or convert it accurately to standard Bengali text (বাংলায়). Output ONLY the transcribed Bengali sentence, nothing else.',
          },
        ],
      },
    });

    const transcribedText = response.text?.trim() || '';
    return res.json({
      success: true,
      text: transcribedText,
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(500).json({
      error: 'ভয়েস টেক্সটে রূপান্তর করা সম্ভব হয়নি।',
      details: error?.message,
    });
  }
});

// Direct ZIP download endpoint for mobile and desktop users
app.get(['/api/download-zip', '/download-project', '/bangla-resell-ai-project.zip'], (_req, res) => {
  const zipPath = path.resolve(__dirname, 'public', 'bangla-resell-ai-project.zip');
  
  if (!fs.existsSync(zipPath)) {
    return res.status(404).send('ZIP ফাইলটি এখনো তৈরি হয়নি।');
  }

  const stat = fs.statSync(zipPath);
  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Length': stat.size,
    'Content-Disposition': 'attachment; filename="bangla-resell-ai-project.zip"',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  });

  const readStream = fs.createReadStream(zipPath);
  readStream.pipe(res);
});

// JSON Base64 endpoint for guaranteed direct browser blob download on Android
app.get('/api/zip-base64', (_req, res) => {
  const zipPath = path.resolve(__dirname, 'public', 'bangla-resell-ai-project.zip');
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ error: 'ZIP file not found' });
  }

  const fileBuffer = fs.readFileSync(zipPath);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    success: true,
    filename: 'bangla-resell-ai-project.zip',
    size: fileBuffer.length,
    base64: fileBuffer.toString('base64'),
  });
});

// Setup dev or prod serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bangla Resell AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
