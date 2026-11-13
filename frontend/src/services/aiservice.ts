
const API_URL = "http://localhost:8080/api";

interface AIResponse {
  status: string;
  answer: string;
}

export async function requestAI(prompt: string): Promise<string> {
  const response = await fetch(`${API_URL}/ai-test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  const data: AIResponse = await response.json();

  if (data.status !== "success" || !data.answer) {
    throw new Error("Invalid AI response received from backend.");
  }

  return data.answer;
}
