// async function sendToAIAPI(fileContents, query) {
//     const apiKey = Gemin_keys;
//     const apiUrl = 'https://api.gemini.ai/analyze'; 

//     const response = await axios.post(apiUrl, {
//         query: query,
//         files: fileContents
//     }, {
//         headers: {
//             'Authorization': `Bearer ${apiKey}`,
//             'Content-Type': 'application/json'
//         }
//     });

//     return response.data;
// }


// const { GoogleGenerativeAI } = require("@google/generative-ai");

// // Access your API key as an environment variable (see "Set up your API key" above)
// const genAI = new GoogleGenerativeAI(Gemin_keys);



// // The Gemini 1.5 models are versatile and work with both text-only and multimodal prompts
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});



// async function run() {
//   const prompt = "whats the difference between codding and programming."

//   const result = await model.generateContent(prompt);
//   const response = await result.response;
//   const text = response.text();
//   console.log(text);
// }

// run();
