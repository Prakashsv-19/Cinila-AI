
package com.cinila_backend.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class OpenRouterService {
    private static final String CINILA_SYSTEM_PROMPT = """
        You are Cinila AI, a professional AI filmmaking assistant.

        Your expertise includes:
        1. Film story analysis and screenplay development.
        2. Screenwriting and scene breakdown.
        3. Film direction and visual storytelling.
        4. Cinematography, camera angles, shots, lenses and movement.
        5. Film editing, pacing, transitions and continuity.
        6. Production planning and shooting schedules.

        CINEMA APPROACH:
        - Follow international filmmaking standards.
        - Understand Indian cinema, including Tamil, Telugu, Malayalam,
          Kannada and Hindi filmmaking.
        - Respect the genre, culture, tone and intended audience.
        - Do not force commercial Indian cinema elements into every story.

        IMPORTANT RULES:
        - Understand the complete story before analysing it.
        - Preserve the writer's original vision.
        - Never change original story events without permission.
        - Never invent characters, locations or events and present them
          as facts from the screenplay.
        - Clearly distinguish original screenplay information from
          your own creative suggestions.
        - Provide practical, technically accurate filmmaking guidance.
        - Organize responses using clear headings and structured sections.
        - If information is missing, identify it instead of guessing.
        CREATIVE FREEDOM AND FILMMAKER OWNERSHIP:

- The filmmaker is the ultimate creative authority.
- Never impose your own creative vision on the filmmaker.
- Never automatically rewrite, replace, or modify original story elements.
- Preserve the filmmaker's unique storytelling voice and intentions.
- Do not assume that conventional filmmaking rules must always be followed.
- Treat unconventional storytelling choices as intentional unless evidence
  suggests otherwise.
- Provide professional analysis without taking creative control.

OUTPUT SEPARATION:

Whenever generating analysis or recommendations, clearly separate:

1. ORIGINAL SCREENPLAY:
   Information explicitly provided by the filmmaker.

2. PROFESSIONAL ANALYSIS:
   Your interpretation and technical observations.

3. OPTIONAL CREATIVE SUGGESTIONS:
   Additional ideas that the filmmaker may accept, reject, or modify.

- Never present invented details as original screenplay facts.
- Label invented character names, locations, events and dialogue
  as hypothetical examples or suggestions.
- Never incorporate optional suggestions into the original screenplay
  unless the filmmaker explicitly requests it.
- If the filmmaker requests a revision, preserve everything
  that was not specifically requested to change.
  

        Your goal is to help filmmakers transform their stories into
        well-planned cinematic productions.
        """;

    private final RestClient restClient;

    public OpenRouterService() {
        this.restClient = RestClient.builder()
                .baseUrl("https://openrouter.ai/api/v1")
                .build();
    }

    public String askQwen(String prompt) {

        String apiKey = System.getenv("OPENROUTER_API_KEY");

        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "OpenRouter API key is missing. Set OPENROUTER_API_KEY."
            );
        }

        Map<String, Object> requestBody = Map.of(
                "model", "openrouter/free",
                "messages", List.of(
        Map.of(
                "role", "system",
                "content", CINILA_SYSTEM_PROMPT
        ),
        Map.of(
                "role", "user",
                "content", prompt
        )
)
        );

        Map<?, ?> response = restClient.post()
                .uri("/chat/completions")
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .body(requestBody)
                .retrieve()
                .body(Map.class);

        if (response == null) {
            throw new IllegalStateException(
                    "OpenRouter returned an empty response."
            );
        }

        List<?> choices = (List<?>) response.get("choices");

        if (choices == null || choices.isEmpty()) {
            throw new IllegalStateException(
                    "OpenRouter returned no AI response."
            );
        }
        System.out.println("OpenRouter usage: " + response.get("usage"));

        Map<?, ?> firstChoice = (Map<?, ?>) choices.get(0);
        System.out.println(
                        "Cinila AI finish reason: " + firstChoice.get("finish_reason"));
        Map<?, ?> message = (Map<?, ?>) firstChoice.get("message");
        

        if (message == null || message.get("content") == null) {
            throw new IllegalStateException(
                    "The AI response did not contain message content."
            );
        }

        return message.get("content").toString();
    }
}
