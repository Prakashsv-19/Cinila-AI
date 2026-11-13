
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth/mammoth.browser";
import { useState } from "react";
import { downloadWordDocument } from "./utils/wordDocument";
import "./index.css";
import { requestAI } from "./services/aiservice";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type Project = {
  id: number;
  title: string;
  genre: string;
  story: string;
  visualStyle: string;
  aspectRatio: string;
  budget: string;
  storyStructure: string;
  analysisDetail: string;
};

function App() {
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [isReading, setIsReading] = useState(false);

  const [page, setPage] = useState<
    "dashboard" | "new-project" | "workspace"
  >("dashboard");

  const [selectedProject, setSelectedProject] =
    useState<Project | null>(null);

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Drama");
  const [story, setStory] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [message, setMessage] = useState("");

  const [visualStyle, setVisualStyle] = useState("Cinematic");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [budget, setBudget] = useState("Low budget");
  const [storyStructure, setStoryStructure] =
    useState("Three-act structure");
  const [analysisDetail, setAnalysisDetail] = useState("Detailed");



  // Milestone 1: Story Analysis
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiError, setAiError] = useState("");

  // Milestone 2: Scene Division
  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneResult, setSceneResult] = useState("");
  const [sceneError, setSceneError] = useState("");

  // Milestone 3: Cinematic Shot Division
  const [shotLoading, setShotLoading] = useState(false);
  const [shotResult, setShotResult] = useState("");
  const [shotError, setShotError] = useState("");

  // Milestone 4: Shoot Plan & Production Guide
  const [productionLoading, setProductionLoading] = useState(false);
  const [productionResult, setProductionResult] = useState("");
  const [productionError, setProductionError] = useState("");

  function resetAIResults() {
    setAiResult("");
    setAiError("");
    setAiLoading(false);

    setSceneResult("");
    setSceneError("");
    setSceneLoading(false);

    setShotResult("");
    setShotError("");
    setShotLoading(false);

    setProductionResult("");
    setProductionError("");
    setProductionLoading(false);
  }
  async function downloadStoryAnalysis() {
  try {
    await downloadWordDocument(
      selectedProject?.title || title || "Untitled Project",
      "Story Analysis",
      aiResult
    );
  } catch (error) {
    console.error("Word document generation failed:", error);
    setAiError("Unable to generate the Word document.");
  }
}
async function downloadSceneBreakdown() {
  try {
    await downloadWordDocument(
      selectedProject?.title || title || "Untitled Project",
      "Scene Division and Dialogue",
      sceneResult
    );
  } catch (error) {
    console.error("Scene document generation failed:", error);
    setSceneError("Unable to generate the Word document.");
  }
}
async function downloadShotBreakdown() {
  try {
    await downloadWordDocument(
      selectedProject?.title || title || "Untitled Project",
      "Cinematic Shot Division",
      shotResult
    );
  } catch (error) {
    console.error("Shot document generation failed:", error);
    setShotError("Unable to generate the Word document.");
  }
}
async function downloadProductionPlan() {
  try {
    await downloadWordDocument(
      selectedProject?.title || title || "Untitled Project",
      "Shoot Plan and Production Guide",
      productionResult
    );
  } catch (error) {
    console.error("Production document generation failed:", error);
    setProductionError("Unable to generate the Word document.");
  }
}


  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileError("");
    setFileName("");
    setIsReading(true);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      let extractedText = "";

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Please choose a file smaller than 10 MB.");
      }

      if (extension === "txt") {
        extractedText = await file.text();
      } else if (extension === "pdf") {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const pages: string[] = [];

        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber++
        ) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();

          pages.push(
            content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" ")
          );
        }

        extractedText = pages.join("\n\n");
      } else if (extension === "docx") {
        const buffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({
          arrayBuffer: buffer,
        });

        extractedText = result.value;
      } else {
        throw new Error("Please upload a .txt, .pdf, or .docx file.");
      }

      if (!extractedText.trim()) {
        throw new Error(
          "No readable text was found. Scanned PDFs may need OCR."
        );
      }

      setStory((previous) =>
        previous.trim()
          ? `${previous}\n\n${extractedText}`
          : extractedText
      );

      setFileName(file.name);
    } catch (error) {
      setFileError(
        error instanceof Error
          ? error.message
          : "Unable to read this file."
      );
    } finally {
      setIsReading(false);
      event.target.value = "";
    }
  }

  function openNewProject() {
    setMessage("");
    setFileName("");
    setFileError("");
    resetAIResults();
    setPage("new-project");
  }

  function saveProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const project: Project = {
      id: Date.now(),
      title: title.trim(),
      genre,
      story: story.trim(),
      visualStyle,
      aspectRatio,
      budget,
      storyStructure,
      analysisDetail,
    };

    setProjects((current) => [project, ...current]);
    setSelectedProject(project);
    setMessage("Project created successfully!");

    setPage("workspace");
  }



 
async function analyzeStory() {
  if (!story.trim()) {
    setAiError("Please enter your story first.");
    return;
  }

  setAiLoading(true);
  setAiError("");
  setAiResult("");

  const prompt = `
Analyse the following film project.

PROJECT TITLE: ${title}
GENRE: ${genre}
VISUAL STYLE: ${visualStyle}
ASPECT RATIO: ${aspectRatio}
PRODUCTION BUDGET: ${budget}
PREFERRED STORY STRUCTURE: ${storyStructure}
ANALYSIS DETAIL: ${analysisDetail}

ORIGINAL STORY / SCREENPLAY:
${story}

Provide your response in three clearly separated sections:

1. ORIGINAL SCREENPLAY INFORMATION
Only identify information explicitly present in the submitted story.
Do not invent missing details.

2. PROFESSIONAL STORY ANALYSIS
Analyse the logline, synopsis, characters, central conflict,
themes and story structure wherever supported by the material.

3. OPTIONAL CREATIVE SUGGESTIONS
Provide separate, clearly labelled ideas for improvement.
These are optional. Never modify the original story.

Respect the filmmaker's creative ownership and original vision.
If information is missing, clearly mention that it was not provided.

The filmmaker is the ultimate creative authority.
Never automatically rewrite or replace the original story.
Clearly distinguish screenplay facts, professional analysis,
and optional suggestions.
`;

  try {
    const answer = await requestAI(prompt);

    setAiResult(answer);
  } catch (error) {
    setAiError(
      error instanceof Error
        ? error.message
        : "Unable to analyse the story."
    );
  } finally {
    setAiLoading(false);
  }
}


 
async function generateScenes() {
  if (!story.trim()) {
    setSceneError("Please enter your original story first.");
    return;
  }

  setSceneLoading(true);
  setSceneError("");
  setSceneResult("");

  setShotResult("");
  setShotError("");

  setProductionResult("");
  setProductionError("");

  const prompt = `
You are Cinila AI, a professional screenplay analyst,
screenwriter and film director.

Your task is to divide the filmmaker's original story
into a professional scene-by-scene breakdown.

PROJECT DETAILS:

Title: ${title}
Genre: ${genre}
Visual Style: ${visualStyle}
Aspect Ratio: ${aspectRatio}
Production Budget: ${budget}
Preferred Story Structure: ${storyStructure}

ORIGINAL STORY / SCREENPLAY:

${story}

IMPORTANT INSTRUCTIONS:

1. Read and understand the complete story before dividing it.
2. Preserve the original story, its events, characters,
   relationships, intentions and narrative order.
3. Do not remove, replace or automatically rewrite any
   original story event.
4. Do not invent new story events, characters or locations.
5. Scene boundaries may be professionally inferred when
   the original story does not explicitly provide them.
   Clearly label inferred details.
6. Do not assume an unspecified location or time of day.
   Write "Not specified" when information is unavailable.
7. Do not invent dialogue and present it as original dialogue.
8. Any newly written dialogue must be labelled
   "OPTIONAL DIALOGUE SUGGESTION".
9. The filmmaker has complete creative authority.

OUTPUT FORMAT:

SECTION 1: SCENE BREAKDOWN

For every scene, provide:

SCENE NUMBER:
Give sequential scene numbers.

SCENE HEADING:
INT. or EXT. - LOCATION - DAY or NIGHT.
Use "Not specified" if the information is unavailable.
Clearly identify inferred scene headings.

CHARACTERS:
List only characters supported by the story.
Do not invent character names.

SCENE PURPOSE:
Explain the purpose of the scene based on the story.

ORIGINAL STORY ACTION:
Describe what actually happens in this scene.
Preserve the original events and their order.

EMOTIONAL TONE:
Describe the emotion or atmosphere supported by the story.

SECTION 2: CHARACTER-WISE DIALOGUE BREAKDOWN

For EVERY scene, provide a dialogue breakdown.

For each scene:

1. Identify every character who speaks.
2. Present dialogues in their correct conversational order.
3. Use the following format:

CHARACTER NAME:
"Dialogue spoken by the character."

CHARACTER NAME:
"Response from the next character."

4. Preserve dialogue explicitly provided in the original screenplay.
5. If the original story contains no exact dialogue, create
   OPTIONAL DIALOGUE SUGGESTIONS based on the scene's context.
6. Never claim generated dialogue is original screenplay dialogue.
7. Maintain each character's established personality,
   intentions, relationships and emotional state.
8. Make conversations natural and appropriate to the genre.
9. Do not give every character unnecessary dialogue.
10. Include meaningful pauses, reactions and silence where
    appropriate.
11. If a character has no dialogue, mention "No dialogue".
12. Do not invent facts or events to justify dialogue.

Clearly distinguish:

ORIGINAL DIALOGUE:
Dialogue explicitly present in the filmmaker's screenplay.

OPTIONAL DIALOGUE SUGGESTIONS:
New dialogue generated by Cinila AI for filmmaker review.

SECTION 3: SCENE PERFORMANCE AND DIRECTOR'S NOTES

For every scene, provide:

- Character emotional states.
- Suggested dialogue delivery and expressions.
- Important pauses and reactions.
- Character interactions and blocking suggestions.
- Important visual moments.

Keep director's notes optional. Do not impose a creative
interpretation on the filmmaker.

SECTION 4: SCENE DIVISION NOTES

Explain:
- How the story was divided into scenes.
- Which scene details were inferred.
- Which locations or timings remain unspecified.
- Any continuity questions requiring filmmaker review.

FINAL RULE:

Never take creative control away from the filmmaker.
All generated dialogue and directorial suggestions are optional.
The filmmaker makes the final decisions.
`;

  try {
    const answer = await requestAI(prompt);

    setSceneResult(answer);
  } catch (error) {
    setSceneError(
      error instanceof Error
        ? error.message
        : "Unable to generate scene breakdown."
    );
  } finally {
    setSceneLoading(false);
  }
}


  
async function generateShots() {
  if (!story.trim()) {
    setShotError("Please enter your original story first.");
    return;
  }

  if (!sceneResult.trim()) {
    setShotError(
      "Please generate the scene breakdown before generating shots."
    );
    return;
  }

  setShotLoading(true);
  setShotError("");
  setShotResult("");

  setProductionResult("");
  setProductionError("");

  const prompt = `
You are Cinila AI, an internationally experienced
Director of Photography (DOP), cinematographer,
camera operator and film visual storytelling consultant.

Create a professional cinematic shot breakdown.

PROJECT DETAILS:
Title: ${title}
Genre: ${genre}
Visual Style: ${visualStyle}
Aspect Ratio: ${aspectRatio}
Production Budget: ${budget}

ORIGINAL STORY:
${story}

SCENE BREAKDOWN:
${sceneResult}

IMPORTANT:
- Create shots for every scene.
- Follow the original scene order.
- Preserve story events and character intentions.
- Do not invent additional story events or characters.
- Choose camera techniques based on dramatic purpose.
- Avoid unnecessary camera movements.
- Consider budget and production limitations.
- Maintain visual continuity.
- Do not assume every dialogue requires a close-up.
- Explain technical terms where useful.
- Do not impose conventional rules on unconventional storytelling.

FOR EVERY SHOT INCLUDE:

1. Shot number.
2. Shot size: EWS, WS, MLS, MS, MCU, CU or ECU.
3. Camera angle.
4. Camera movement.
5. Suggested lens focal length in mm and reason.
6. Camera composition and framing.
7. Visual action.
8. Relevant dialogue reference.
9. Lighting suggestion.
10. Shot purpose.

ADDITIONAL SECTIONS:

- Optional cinematic alternatives.
- Continuity and production notes.
- DOP creative notes.

Clearly distinguish original screenplay facts from professional
recommendations and optional creative suggestions.

The filmmaker has complete creative authority.
The shot breakdown is a recommendation, not a mandatory instruction.
`;

  try {
    const answer = await requestAI(prompt);

    setShotResult(answer || "No cinematic shot breakdown received.");
  } catch (error) {
    setShotError(
      error instanceof Error
        ? error.message
        : "Unable to generate cinematic shots."
    );
  } finally {
    setShotLoading(false);
  }
}


  // Milestone 4: Shoot Plan & Production Guide
  async function generateProductionPlan() {
    if (!story.trim()) {
      setProductionError("Please provide the screenplay first.");
      return;
    }

    if (!sceneResult.trim()) {
      setProductionError(
        "Please generate the scene breakdown before creating the production plan."
      );
      return;
    }

    if (!shotResult.trim()) {
      setProductionError(
        "Please generate the cinematic shot breakdown before creating the production plan."
      );
      return;
    }

    setProductionLoading(true);
    setProductionError("");
    setProductionResult("");

    const prompt = `
You are Cinila AI, a professional film production planner.

Create a practical Shoot Plan & Production Guide using the following information.

ORIGINAL SCREENPLAY:
${story}

SCENE BREAKDOWN:
${sceneResult}

CINEMATIC SHOT BREAKDOWN:
${shotResult}

CREATIVE OWNERSHIP RULES:
- Preserve the filmmaker's original story and creative vision.
- Do not rewrite or change the screenplay.
- Never invent confirmed production facts.
- Clearly mark unknown information as "Not specified".
- Separate confirmed screenplay facts, professional analysis, and optional suggestions.
- Label all creative additions as optional suggestions.

GENERATE THE FOLLOWING SECTIONS:

1. PRODUCTION OVERVIEW
Summarize the production requirements based only on available information.

2. SCENE AND LOCATION BREAKDOWN
List every scene in screenplay order.
Include scene number, location, INT/EXT, time of day, required characters,
props, and continuity requirements.
Mark missing details as "Not specified".

3. PROPOSED SHOOTING SCHEDULE
Suggest a practical shooting order.
Group scenes by location where possible to reduce travel and setup.
Explain when the suggested shooting order differs from screenplay order.
Clearly label this as a proposed schedule, not a confirmed schedule.

4. CAST REQUIREMENTS
List the characters required for each scene.
Do not invent actors or cast members.

5. PROPS AND COSTUME CHECKLIST
List explicitly mentioned items separately from inferred requirements
and optional suggestions.

6. ESTIMATED SHOOTING TIME
Provide rough planning estimates per scene and setup.
Explain that these are preliminary estimates requiring filmmaker review.
Do not present estimates as confirmed facts.

7. CONTINUITY CHECKLIST
Include relevant costume, prop, character-position, lighting, weather,
and time-of-day continuity points wherever applicable.

8. EQUIPMENT AND CREW PREPARATION
Suggest equipment and crew requirements based on the scenes and shots.
Clearly label inferred requirements as recommendations.

9. PRODUCTION DAY CHECKLIST
Provide a practical checklist for preparation before each shooting day.

10. OPTIONAL COST-SAVING SUGGESTIONS
Suggest ways to reduce travel, setup changes, and production complexity
without changing the story or compromising the filmmaker's vision.

Use clear headings, numbered lists, and tables where useful.
Make the plan practical for an independent film production.

Keep original screenplay facts, professional analysis, and optional
creative suggestions clearly separated.
`;

    try {
      const response = await fetch(
        "http://localhost:8080/api/ai-test",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
        }
      );

      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: responseText };
      }

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${
            data.message || data.error || responseText || "Unknown error"
          }`
        );
      }

      if (!data.answer) {
        throw new Error("The AI returned an empty production plan.");
      }

      setProductionResult(data.answer);
    } catch (error) {
      console.error("Production plan error:", error);

      setProductionError(
        error instanceof Error
          ? error.message
          : "Unable to generate the production plan."
      );
    } finally {
      setProductionLoading(false);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
  <div className="brand-logo">
    <img
      src="/cinila-logo.png"
      alt="Cinila AI"
      className="brand-logo-image"
    />
  </div>

  <button className="new-project" onClick={openNewProject}>
    <span>＋</span> New Project
  </button>

  <p className="nav-label">CINEMATIC WORKFLOW</p>

  <nav className="navigation">
    <button
      className={`nav-item ${page === "dashboard" ? "active" : ""}`}
      onClick={() => setPage("dashboard")}
    >
      <span>⌂</span>
      <div>Dashboard</div>
    </button>

    <button
      className="nav-item"
      onClick={() => setPage(selectedProject ? "workspace" : "new-project")}
    >
      <span>▤</span>
      <div>
        <strong>Milestone 1</strong>
        <small>Story Analysis</small>
      </div>
    </button>

    <button
      className="nav-item"
      onClick={() => setPage(selectedProject ? "workspace" : "new-project")}
    >
      <span>🎬</span>
      <div>
        <strong>Milestone 2</strong>
        <small>Scene Division & Dialogue</small>
      </div>
    </button>

    <button
      className="nav-item"
      onClick={() => setPage(selectedProject ? "workspace" : "new-project")}
    >
      <span>▣</span>
      <div>
        <strong>Milestone 3</strong>
        <small>Cinematic Shot Division</small>
      </div>
    </button>

    <button
      className="nav-item"
      onClick={() => setPage(selectedProject ? "workspace" : "new-project")}
    >
      <span>▦</span>
      <div>
        <strong>Milestone 4</strong>
        <small>Shoot Plan & Production Guide</small>
      </div>
    </button>
  </nav>

  <div className="sidebar-project-section">
    <p className="nav-label">PROJECT</p>

    <button
      className="nav-item"
      onClick={() => setPage("dashboard")}
    >
      <span>▱</span>
      <div>My Projects</div>
    </button>
  </div>

  <div className="sidebar-bottom">
    <div>
      <strong>Cinila AI</strong>
      <p>AI Filmmaking Assistant</p>
      <p>Transforming Stories into Films</p>
    </div>
  </div>
</aside>

      <main className="main-content">
        <header className="topbar">
  <div className="topbar-left">
    <span className="breadcrumb">
      {page === "dashboard"
        ? "Dashboard"
        : page === "new-project"
        ? "New Project"
        : "Filmmaking Workspace"}
    </span>
  </div>

  <div className="status">
    <span className="status-dot" />
    Your creative workspace
  </div>
</header>

        {page === "dashboard" ? (
          <>
            <section className="welcome-section">
              <p className="eyebrow">YOUR CREATIVE STUDIO</p>

              <h1>
                Every great film starts
                <br />
                with <span>an idea.</span>
              </h1>

              <p className="welcome-description">
                Turn your screenplay into a cinematic production plan.
                Organize scenes, explore camera angles, and bring your
                vision to life with Cinila AI.
              </p>

              

              <button
                className="primary-button"
                onClick={openNewProject}
              >
                ＋ Create a new project
              </button>

              {message && (
                <p className="success-message">{message}</p>
              )}
            </section>

<section className="workflow-section dashboard-milestones">
  <div className="section-heading">
    <div>
      <p className="eyebrow">YOUR FILMMAKING JOURNEY</p>
      <h2>From story to screen</h2>
      <p className="welcome-description">
        Four professional stages to transform your screenplay
        into a structured cinematic production plan.
      </p>
    </div>

    <span className="step-count">4 MILESTONES</span>
  </div>

  <div className="workflow-grid milestone-grid">

    {/* Milestone 1 */}
    <article className="workflow-card milestone-card">
      <div className="milestone-top">
        <div className="card-icon purple">01</div>
        <span className={aiResult ? "milestone-completed" : "milestone-pending"}>
          {aiResult ? "Completed" : "Not Started"}
        </span>
      </div>

      <h3>Story & Screenplay Analysis</h3>
      <p>
        Understand your logline, synopsis, characters,
        themes and story structure.
      </p>

      <button
        className="primary-button"
        onClick={() => {
          if (selectedProject) {
            setPage("workspace");
          } else {
            openNewProject();
          }
        }}
      >
        {aiResult ? "View Analysis →" : "Start Analysis →"}
      </button>
    </article>

    {/* Milestone 2 */}
    <article className="workflow-card milestone-card">
      <div className="milestone-top">
        <div className="card-icon orange">02</div>
        <span className={sceneResult ? "milestone-completed" : "milestone-pending"}>
          {sceneResult ? "Completed" : "Not Started"}
        </span>
      </div>

      <h3>Scene Division & Dialogue</h3>
      <p>
        Organize your story into scenes with character
        actions and dialogue breakdowns.
      </p>

      <button
        className="primary-button"
        onClick={() => {
          if (selectedProject) {
            setPage("workspace");
          } else {
            openNewProject();
          }
        }}
      >
        {sceneResult ? "View Scenes →" : "Start Scene Division →"}
      </button>
    </article>

    {/* Milestone 3 */}
    <article className="workflow-card milestone-card">
      <div className="milestone-top">
        <div className="card-icon green">03</div>
        <span className={shotResult ? "milestone-completed" : "milestone-pending"}>
          {shotResult ? "Completed" : "Not Started"}
        </span>
      </div>

      <h3>Cinematic Shot Division</h3>
      <p>
        Explore shot sizes, camera angles, lens suggestions
        and visual storytelling.
      </p>

      <button
        className="primary-button"
        onClick={() => {
          if (selectedProject) {
            setPage("workspace");
          } else {
            openNewProject();
          }
        }}
      >
        {shotResult ? "View Shots →" : "Start Shot Division →"}
      </button>
    </article>

    {/* Milestone 4 */}
    <article className="workflow-card milestone-card">
      <div className="milestone-top">
        <div className="card-icon purple">04</div>
        <span className={productionResult ? "milestone-completed" : "milestone-pending"}>
          {productionResult ? "Completed" : "Not Started"}
        </span>
      </div>

      <h3>Shoot Plan & Production Guide</h3>
      <p>
        Prepare shooting schedules, locations, cast,
        props and continuity requirements.
      </p>

      <button
        className="primary-button"
        onClick={() => {
          if (selectedProject) {
            setPage("workspace");
          } else {
            openNewProject();
          }
        }}
      >
        {productionResult ? "View Production Plan →" : "Start Production Plan →"}
      </button>
    </article>

  </div>
</section>

            <section className="projects-section">
              <p className="eyebrow">YOUR LIBRARY</p>
              <h2>Recent projects</h2>

              {projects.length === 0 ? (
                <div className="empty-projects">
                  <div className="empty-icon">▤</div>
                  <h3>Your next story starts here</h3>
                  <p>
                    Your projects will appear here as you create them.
                  </p>

                  <button
                    className="secondary-button"
                    onClick={openNewProject}
                  >
                    Start your first project
                  </button>
                </div>
              ) : (
                <div className="workflow-grid project-list">
                  {projects.map((project) => (
                    <article className="workflow-card" key={project.id}>
                      <div className="card-icon purple">✦</div>
                      <h3>{project.title}</h3>
                      <p>{project.genre} · Draft project</p>

                      <button
                        className="secondary-button"
                        onClick={() => {
                          setSelectedProject(project);
                          setTitle(project.title);
                          setGenre(project.genre);
                          setStory(project.story);
                          setVisualStyle(project.visualStyle);
                          setAspectRatio(project.aspectRatio);
                          setBudget(project.budget);
                          setStoryStructure(project.storyStructure);
                          setAnalysisDetail(project.analysisDetail);

                          resetAIResults();
                          setPage("workspace");
                        }}
                      >
                        Open workspace →
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : page === "new-project" ? (
          <section className="project-editor">
            <p className="eyebrow">LET'S BUILD YOUR NEXT FILM</p>

            <h1 className="editor-title">
              Start with <span>your story.</span>
            </h1>

            <p className="welcome-description">
              Give your project a name and introduce the story you want
              Cinila AI to help you develop.
            </p>

            <form className="project-form" onSubmit={saveProject}>
              <label htmlFor="project-title">Project title</label>
              <input
                id="project-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. The Last Train"
                required
                maxLength={100}
              />

              <label htmlFor="project-genre">Film genre</label>
              <select
                id="project-genre"
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
              >
                <option>Drama</option>
                <option>Action</option>
                <option>Thriller</option>
                <option>Romance</option>
                <option>Comedy</option>
                <option>Horror</option>
                <option>Science Fiction</option>
                <option>Fantasy</option>
                <option>Documentary</option>
              </select>

              <label htmlFor="visual-style">Visual style</label>
              <select
                id="visual-style"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
              >
                <option value="Realistic">Realistic</option>
                <option value="Cinematic">Cinematic</option>
                <option value="Neo-noir">Neo-noir</option>
                <option value="Vintage">Vintage</option>
                <option value="Dreamlike">Dreamlike</option>
              </select>

              <label htmlFor="aspect-ratio">Aspect ratio</label>
              <select
                id="aspect-ratio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                <option value="16:9">16:9 — Standard widescreen</option>
                <option value="2.39:1">2.39:1 — Anamorphic cinema</option>
                <option value="9:16">9:16 — Vertical video</option>
                <option value="1:1">1:1 — Square</option>
              </select>

              <label htmlFor="budget">Production budget</label>
              <select
                id="budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              >
                <option value="Low budget">Low budget</option>
                <option value="Medium budget">Medium budget</option>
                <option value="High budget">High budget</option>
              </select>

              <label htmlFor="story-structure">Story structure</label>
              <select
                id="story-structure"
                value={storyStructure}
                onChange={(e) => setStoryStructure(e.target.value)}
              >
                <option value="Three-act structure">
                  Three-act structure
                </option>
                <option value="Hero's journey">Hero's journey</option>
                <option value="Non-linear">
                  Non-linear storytelling
                </option>
              </select>

              <label htmlFor="analysis-detail">Analysis detail</label>
              <select
                id="analysis-detail"
                value={analysisDetail}
                onChange={(e) => setAnalysisDetail(e.target.value)}
              >
                <option value="Basic">Basic</option>
                <option value="Detailed">Detailed</option>
                <option value="Professional">Professional</option>
              </select>

              <label htmlFor="story-file">
                Import a screenplay file
              </label>

              <input
                id="story-file"
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={handleFileChange}
                disabled={isReading}
              />

              <p className="form-hint">
                Supported formats: TXT, PDF, DOCX. Maximum file size:
                10 MB.
              </p>

              {isReading && (
                <p className="form-hint">
                  Reading your screenplay...
                </p>
              )}

              {fileName && (
                <p className="success-message">
                  Imported: {fileName}
                </p>
              )}

              {fileError && (
                <p className="file-error">{fileError}</p>
              )}

              <label htmlFor="project-story">
                Story or screenplay
              </label>

              <textarea
                id="project-story"
                value={story}
                onChange={(event) => setStory(event.target.value)}
                placeholder="Write your story, paste a screenplay, or describe your film idea..."
                rows={10}
                required
              />

              <p className="form-hint">
                Your screenplay remains yours. Cinila AI provides
                analysis and separate optional creative suggestions.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={analyzeStory}
                disabled={
                  aiLoading ||
                  sceneLoading ||
                  shotLoading ||
                  productionLoading ||
                  isReading ||
                  !story.trim()
                }
              >
                {aiLoading
                  ? "Analysing your story..."
                  : "Analyse Story →"}
              </button>

              {aiError && (
                <p className="file-error">{aiError}</p>
              )}

              {aiResult && (
                <div className="document-card">
                  <div className="document-icon">DOC</div>
                  <div className="document-info">
                    <h3>Story & Screenplay Analysis</h3>
                    <p>Your analysis is ready as a Word document.</p>
                    <span className="document-status">Ready to download</span>
                  </div>
                  <button
                    type="button"
                    className="download-button"
                    onClick={downloadStoryAnalysis}
                  >
                    <span>↓</span> Download .DOCX
                  </button>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPage("dashboard")}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    aiLoading ||
                    sceneLoading ||
                    shotLoading ||
                    productionLoading
                  }
                >
                  Save draft →
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="project-editor">
            <p className="eyebrow">YOUR FILMMAKING WORKSPACE</p>

            <h1 className="editor-title">
              {selectedProject?.title || title}
            </h1>

            <p className="welcome-description">
              Your story is ready. Choose a filmmaking feature to
              develop your project.
            </p>

            <div className="form-actions">
              <button
                className="secondary-button"
                onClick={() => setPage("dashboard")}
              >
                ← Dashboard
              </button>

              <button
                className="secondary-button"
                onClick={() => setPage("new-project")}
              >
                Edit Story
              </button>
            </div>

            <div className="workflow-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">AI FILMMAKING TOOLS</p>
                  <h2>From story to production</h2>
                </div>

                <span className="step-count">4 FEATURES</span>
              </div>

              <div className="workflow-grid">
                <article className="workflow-card">
                  <div className="card-icon purple">01</div>
                  <h3>Story & Screenplay Analysis</h3>
                  <p>
                    Understand your logline, synopsis, characters,
                    themes and three-act structure.
                  </p>

                  <button
                    className="primary-button"
                    onClick={analyzeStory}
                    disabled={
                      aiLoading ||
                      sceneLoading ||
                      shotLoading ||
                      productionLoading ||
                      !story.trim()
                    }
                  >
                    {aiLoading ? "Analysing..." : "Analyse Story →"}
                  </button>
                </article>

                <article className="workflow-card">
                  <div className="card-icon orange">02</div>
                  <h3>Scene Division & Dialogue</h3>
                  <p>
                    Divide your original story into structured scenes
                    with actions and suggested dialogue.
                  </p>

                  <button
                    className="primary-button"
                    onClick={generateScenes}
                    disabled={
                      aiLoading ||
                      sceneLoading ||
                      shotLoading ||
                      productionLoading ||
                      !story.trim()
                    }
                  >
                    {sceneLoading
                      ? "Generating scenes..."
                      : "Generate Scenes →"}
                  </button>
                </article>

                <article className="workflow-card">
                  <div className="card-icon green">03</div>
                  <h3>Cinematic Shot Division</h3>
                  <p>
                    Explore shot sizes, camera angles, movements,
                    lenses and visual storytelling options.
                  </p>

                  <button
                    className="primary-button"
                    onClick={generateShots}
                    disabled={
                      aiLoading ||
                      sceneLoading ||
                      shotLoading ||
                      productionLoading ||
                      !sceneResult.trim()
                    }
                  >
                    {shotLoading
                      ? "Generating shots..."
                      : "Generate Cinematic Shots →"}
                  </button>
                </article>

                <article className="workflow-card">
                  <div className="card-icon purple">04</div>
                  <h3>Shoot Plan & Production Guide</h3>
                  <p>
                    Prepare shooting schedules, location grouping,
                    cast, props and continuity notes.
                  </p>

                  <button
                    className="primary-button"
                    onClick={generateProductionPlan}
                    disabled={
                      productionLoading ||
                      aiLoading ||
                      sceneLoading ||
                      shotLoading ||
                      !sceneResult.trim() ||
                      !shotResult.trim()
                    }
                  >
                    {productionLoading
                      ? "Generating production plan..."
                      : "Generate Production Plan →"}
                  </button>
                </article>
              </div>
            </div>

            {productionLoading && (
              <div className="ai-result">
                <h2>Preparing your production guide</h2>
                <p>
                  Cinila AI is organizing your scenes, locations,
                  cast, props and shooting schedule...
                </p>
              </div>
            )}

            {productionError && (
              <p className="file-error">{productionError}</p>
            )}

            {productionResult && (
              <div className="document-card">
                <div className="document-icon">DOC</div>
                <div className="document-info">
                  <h3>Shoot Plan & Production Guide</h3>
                  <p>Your production guide is ready as a Word document.</p>
                  <span className="document-status">Ready to download</span>
                </div>
                <button
                  type="button"
                  className="download-button"
                  onClick={downloadProductionPlan}
                >
                  <span>↓</span> Download .DOCX
                </button>
              </div>
            )}

            {aiError && (
              <p className="file-error">{aiError}</p>
            )}

            {aiResult && (
                <div className="document-card">
                  <div className="document-icon">DOC</div>
                  <div className="document-info">
                    <h3>Story & Screenplay Analysis</h3>
                    <p>Your analysis is ready as a Word document.</p>
                    <span className="document-status">Ready to download</span>
                  </div>
                  <button
                    type="button"
                    className="download-button"
                    onClick={downloadStoryAnalysis}
                  >
                    <span>↓</span> Download .DOCX
                  </button>
                </div>
              )}
            {sceneError && (
              <p className="file-error">{sceneError}</p>
            )}

            {sceneResult && (
              <div className="document-card">
                <div className="document-icon">DOC</div>
                <div className="document-info">
                  <h3>Scene Division & Dialogue</h3>
                  <p>Your scene breakdown is ready as a Word document.</p>
                  <span className="document-status">Ready to download</span>
                </div>
                <button
                  type="button"
                  className="download-button"
                  onClick={downloadSceneBreakdown}
                >
                  <span>↓</span> Download .DOCX
                </button>
              </div>
            )}

            {shotError && (
              <p className="file-error">{shotError}</p>
            )}

            {shotResult && (
              <div className="document-card">
                <div className="document-icon">DOC</div>
                <div className="document-info">
                  <h3>Cinematic Shot Division</h3>
                  <p>Your DOP-style shot breakdown is ready as a Word document.</p>
                  <span className="document-status">Ready to download</span>
                </div>
                <button
                  type="button"
                  className="download-button"
                  onClick={downloadShotBreakdown}
                >
                  <span>↓</span> Download .DOCX
                </button>
              </div>
            )}
          </section>
        )}

        <footer className="footer">
          <span>Cinila AI · Your story, thoughtfully crafted.</span>
          <span>CREATED FOR FILMMAKERS</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
