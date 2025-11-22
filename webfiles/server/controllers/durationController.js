const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyCh4W_HgKVepfvay7fSu4MNfu3RtEYPxE8"); // Replace with your key

async function calculateDurationWithGemini(start, end) {
const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
console.log("🧠 Gemini raw response:", text);


  const prompt = `
    Calculate the duration in minutes between:
    Start: ${start}
    End: ${end}
    Only return the number in minutes (integer).
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  const minutes = parseInt(text.match(/\d+/)?.[0]);
  return isNaN(minutes) ? null : minutes;
}

const calculateDuration = async (req, res) => {
  try {
    const { start, end } = req.body;
    if (!start || !end) {
      return res.status(400).json({ error: "Start and end are required." });
    }

    const minutes = await calculateDurationWithGemini(start, end);
    res.json({ minutes });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: "Failed to calculate duration" });
  }
};

module.exports = {
  calculateDuration,
};
