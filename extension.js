const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

require("dotenv").config({
  path: path.resolve(__dirname, '.env')
});

const Gemin_keys = process.env.GEMIN_AI_keys;
// console.log('here is keys',Gemin_keys) 


// console.log('im here now')
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.openAIAnalyzer', async () => {
        const panel = vscode.window.createWebviewPanel(
            'aiCodeAnalyzer',
            'AI Code Analyzer',
            vscode.ViewColumn.One,
            { enableScripts: true }
			
        );
		console.log('open ai analized');
		vscode.window.showWarningMessage('open ai api not available')

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const projectPath = workspaceFolders[0].uri.fsPath;
            console.log(`Project path: ${projectPath}`); // Log project path
			

            const fileStructure = await getFileStructure(projectPath);
            console.log(`File Structure: ${JSON.stringify(fileStructure, null, 2)}`); // Log file structure

            panel.webview.html = getWebviewContent(fileStructure);

            panel.webview.onDidReceiveMessage(async (message) => {
                if (message.command === 'analyze') {
                    const filesToAnalyze = message.files;
                    const query = message.query;
                    const fileContents = await getFileContents(filesToAnalyze);
					console.log({'file content':fileContents});
                    const result = await sendToAIAPI(fileContents, query);
                    panel.webview.postMessage({ command: 'result', result: result });
                }
            });
        }
    });

    context.subscriptions.push(disposable);
}

async function getFileStructure(dir) {
    const files = await fs.promises.readdir(dir);
    const structure = [];

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.promises.stat(fullPath);

        if (stat.isDirectory()) {
            structure.push({ name: file, type: 'directory', children: await getFileStructure(fullPath) });
        } else {
            structure.push({ name: file, type: 'file', path: fullPath });
        }
    }
    return structure;
}

async function getFileContents(files) {
    const contents = {};
    for (const file of files) {
        contents[file] = await fs.promises.readFile(file, 'utf-8');
    }
    return contents;
}


async function sendToAIAPI(fileContents, query) {
    const apiKey = Gemin_keys;
    const apiUrl = 'https://api.gemini.ai/analyze'; // Replace with the actual API URL

    const response = await axios.post(apiUrl, {
        query: query,
        files: fileContents
    }, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data;
}


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



function generateFileStructureHTML(structure) {
    let html = '<ul>';
    for (const item of structure) {
        if (item.type === 'directory') {
            html += `

			<li class="directory">📁
                    <span class="directory-name"> ${item.name}</span>
                    <ul class="directory-content">
                        <span> 📄└─ ${generateFileStructureHTML(item.children)}</span>
                    </ul>
                </li>`;
			
        } else {
            html += `<li class="file">
			
				<input type="checkbox" value="${item.path}">
				
				<span>${item.name}</span>
			
			</li>`;
			// console.log(item.name);
        }
    }
    html += '</ul>';
    return html;
}

function getWebviewContent(fileStructure) {
    const fileStructureHTML = generateFileStructureHTML(fileStructure);
    // console.log(`Generated HTML: ${fileStructureHTML}`); // Log generated HTML
    return `
 <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Code Analyzer</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background-color: #121212;
            color: #e0e0e0;
        }
        h1 {
            color: #007acc;
            text-shadow: 2px 2px 0 #005b99, 4px 4px 0 #004c7f; /* 3D effect with multiple shadows */
            margin-bottom: 20px; /* Space between heading and content */
        }
        #file-structure {
            margin: 20px 0; /* Space below file structure */
        }
        .directory, .file {
            margin: 10px 0;
        }
        .directory-name, .file-name {
            cursor: pointer;
            color: #81d4fa;
            display: flex;
            align-items: center;
        }
        .directory-name::before {
            content: '\f07c';
            font-family: 'Font Awesome 5 Free';
            margin-right: 10px;
        }
        .file-name::before {
            content: '\f15b';
            font-family: 'Font Awesome 5 Free';
            margin-right: 10px;
        }
        .directory-content {
            display: none;
            padding-left: 20px;
            border-left: 1px solid #333;
            margin-left: 10px;
        }
        .directory.open > .directory-content {
            display: block;
        }
        input[type="checkbox"] {
            margin-right: 10px;
            transform: scale(1.2);
            accent-color: #80d8ff;
        }
        #file-select {
            width: 100%;
            margin-top: 20px;
            padding: 10px;
            background-color: #1e1e1e;
            border: 1px solid #333;
            color: #e0e0e0;
            border-radius: 5px;
        }
        #file-select option {
            background-color: #1e1e1e;
            color: #e0e0e0;
        }
        .textarea-container {
            position: relative;
            width: 100%;
            margin-top: 10px;
        }
        #query {
            width: 95%;
            padding: 10px;
            background-color: #1e1e1e;
            border: 1px solid #333;
            color: #e0e0e0;
            border-radius: 5px;
            padding-right: 60px; /* Adjust padding to make space for the button */
            resize: vertical; /* Allow vertical resizing */
            min-height: 100px; /* Minimum height to show multiple lines */
        }
            
        #analyze {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 40px;
            height: 40px;
            background-color: #007acc;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #analyze:hover {
            background-color: #005b99;
        }
        #analyze i {
            font-size: 18px;
        }
        #result {
            margin-top: 20px;
            white-space: pre-wrap;
            background-color: #1e1e1e;
            padding: 10px;
            border: 1px solid #333;
            color: #e0e0e0;
            border-radius: 5px;
        }

        /* Media Queries for responsiveness */
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            h1 {
                font-size: 24px;
            }
            #file-select, #query {
                font-size: 14px;
            }
            #analyze {
                width: 35px;
                height: 35px;
            }
            #analyze i {
                font-size: 16px;
            }
        }

        @media (max-width: 480px) {
            h1 {
                font-size: 20px;
            }
            #file-select, #query {
                font-size: 12px;
            }
            #analyze {
                width: 30px;
                height: 30px;
            }
            #analyze i {
                font-size: 14px;
            }
        }
    </style>
</head>
<body>
    <h1>AI Code Analyzer</h1>
    <div id="file-structure">
        ${fileStructureHTML}
    </div>
    <select id="file-select" multiple></select>
    <div class="textarea-container">
        <textarea id="query" rows="4" cols="50" placeholder="Enter your query..."></textarea>
        <button id="analyze"><i class="fas fa-brain"></i></button>
    </div>
    <pre id="result"></pre>

    <script>
        document.querySelectorAll('.directory-name').forEach(dir => {
            dir.addEventListener('click', () => {
                dir.parentElement.classList.toggle('open');
            });
        });

        const vscode = acquireVsCodeApi();
        document.getElementById('analyze').addEventListener('click', () => {
            const selectedFiles = Array.from(document.querySelectorAll('#file-structure input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
            const query = document.getElementById('query').value;
            vscode.postMessage({ command: 'analyze', files: selectedFiles, query: query });
        });

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'result') {
                document.getElementById('result').textContent = message.result;
            }
        });
    </script>
</body>
</html>
    `;
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate
};
