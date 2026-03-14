"""
Generate Quest Field Guide PDFs for ReGen Civics.
Run: python scripts/generate-quest-pdfs.py
Output: public/quest-guides/*.pdf
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_CENTER
import os

DARK_GREEN = colors.HexColor("#1a472a")
MID_GREEN = colors.HexColor("#4a7c59")
LIGHT_GREEN = colors.HexColor("#7dd87d")
PARCHMENT = colors.HexColor("#f0ebe3")
TEXT_COLOR = colors.HexColor("#2d3748")

def make_styles():
    return {
        "title": ParagraphStyle("title", fontSize=26, textColor=DARK_GREEN, spaceAfter=4,
                                fontName="Helvetica-Bold", leading=30),
        "subtitle": ParagraphStyle("subtitle", fontSize=14, textColor=MID_GREEN, spaceAfter=16,
                                   fontName="Helvetica", leading=18),
        "section": ParagraphStyle("section", fontSize=11, textColor=DARK_GREEN, spaceAfter=6,
                                  spaceBefore=14, fontName="Helvetica-Bold", leading=14),
        "body": ParagraphStyle("body", fontSize=10, textColor=TEXT_COLOR, spaceAfter=8,
                               fontName="Helvetica", leading=15),
        "story": ParagraphStyle("story", fontSize=10.5, textColor=DARK_GREEN, spaceAfter=10,
                                fontName="Helvetica-Oblique", leading=16,
                                backColor=PARCHMENT, borderPad=10,
                                leftIndent=10, rightIndent=10),
        "step_title": ParagraphStyle("step_title", fontSize=10, textColor=DARK_GREEN,
                                     fontName="Helvetica-Bold", leading=13),
        "step_body": ParagraphStyle("step_body", fontSize=9.5, textColor=TEXT_COLOR,
                                    fontName="Helvetica", leading=14, leftIndent=14, spaceAfter=8),
        "tip": ParagraphStyle("tip", fontSize=9.5, textColor=MID_GREEN,
                              fontName="Helvetica-Oblique", leading=13, leftIndent=14, spaceAfter=4),
        "footer": ParagraphStyle("footer", fontSize=8, textColor=colors.HexColor("#94a3b8"),
                                 fontName="Helvetica", alignment=TA_CENTER, leading=10),
        "label": ParagraphStyle("label", fontSize=9, textColor=MID_GREEN,
                                fontName="Helvetica-Bold", leading=12, spaceAfter=2),
        "meta": ParagraphStyle("meta", fontSize=9.5, textColor=TEXT_COLOR,
                               fontName="Helvetica", leading=13, spaceAfter=6),
    }

def build_pdf(outdir, quest):
    path = os.path.join(outdir, quest["filename"] + ".pdf")
    doc = SimpleDocTemplate(
        path, pagesize=letter,
        leftMargin=0.85*inch, rightMargin=0.85*inch,
        topMargin=1*inch, bottomMargin=0.85*inch
    )
    s = make_styles()
    story = []

    story.append(HRFlowable(width="100%", thickness=3, color=LIGHT_GREEN, spaceAfter=10))
    story.append(Paragraph(quest["title"], s["title"]))
    story.append(Paragraph(quest["subtitle"], s["subtitle"]))

    meta_parts = []
    if quest.get("estimatedTime"):
        meta_parts.append("<b>Time:</b> " + quest["estimatedTime"])
    if quest.get("rewards"):
        r = quest["rewards"]
        meta_parts.append("<b>Reward:</b> " + str(r["regen"]) + " $ReGen + " + str(r["rvoice"]) + " RVoice")
    if meta_parts:
        story.append(Paragraph("   |   ".join(meta_parts), s["meta"]))

    if quest.get("deliverable"):
        story.append(Paragraph("Deliverable:", s["label"]))
        story.append(Paragraph(quest["deliverable"], s["meta"]))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#d1e7d8"), spaceAfter=12))

    if quest.get("storyCard"):
        story.append(Paragraph("The Story", s["section"]))
        story.append(Paragraph(quest["storyCard"], s["story"]))
        story.append(Spacer(1, 8))

    if quest.get("steps"):
        story.append(Paragraph("Step by Step", s["section"]))
        for step in quest["steps"]:
            if step["title"] == "Details Coming Soon":
                story.append(Paragraph("Full step-by-step guide coming soon. Join the forum for community guidance.", s["step_body"]))
            else:
                story.append(Paragraph("Step " + str(step["step"]) + ": " + step["title"], s["step_title"]))
                story.append(Paragraph(step["description"], s["step_body"]))

    if quest.get("tips"):
        story.append(Paragraph("Tips", s["section"]))
        for tip in quest["tips"]:
            story.append(Paragraph("- " + tip, s["tip"]))

    if quest.get("resources"):
        story.append(Paragraph("Resources", s["section"]))
        for r in quest["resources"]:
            story.append(Paragraph("<b>" + r["title"] + ":</b> " + r["url"], s["step_body"]))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#d1e7d8"), spaceAfter=8))
    story.append(Paragraph("ReGen Civics Field Guide  |  regencivics.earth  |  Part of the Infinite Game", s["footer"]))

    doc.build(story)
    print("Generated: " + path)

QUESTS = [
    {
        "filename": "quest-00-fire",
        "title": "Quest 0: Fire",
        "subtitle": "Transforming Passion into Purpose",
        "storyCard": "Before we can build anything new we have to be willing to let go of the old. Fire transmutes instantly. Stories, maladaptations, and perspectives that no longer serve us can be released in a single ceremony if we are willing. As our world gets more immersed in effective and personalized propaganda, Fire offers a different path: discerning truth directly, from our own relationship to ourselves and to life.",
        "rewards": {"regen": 111, "rvoice": 1},
        "deliverable": "A video or article sharing your fire and passion",
        "estimatedTime": "2-4 hours",
        "steps": [
            {"step": 1, "title": "Reflect", "description": "Spend time in quiet reflection. What issues, causes, or activities make you feel most alive? What would you do even if you weren't paid?"},
            {"step": 2, "title": "Journal", "description": "Write freely about your passions, dreams, and what you want to contribute to the world. Don't edit yourself."},
            {"step": 3, "title": "Identify Themes", "description": "Look for patterns in your reflections. What themes emerge? What connects your various interests?"},
            {"step": 4, "title": "Create Your Story", "description": "Craft a compelling narrative about your fire. This could be a 3-minute video or a written article."},
            {"step": 5, "title": "Share and Submit", "description": "Share your creation with the community and submit for review."}
        ],
        "resources": [
            {"title": "Watch Intro Video", "url": "https://www.youtube.com/watch?v=U5ZTTy0SCaA"},
            {"title": "SEEDS Quest Guide", "url": "https://explore.joinseeds.earth/regen-civics-infinite-game/play-the-game/quest"}
        ],
        "tips": ["Be authentic - there is no right or wrong answer", "Consider recording multiple takes and choosing your favorite", "Share from the heart, not just the head"]
    },
    {
        "filename": "quest-01-potions",
        "title": "Quest 1: Potions",
        "subtitle": "Healing Modalities",
        "storyCard": "The Potions Quest introduces us to the world of living fermented foods, medicinal preparations, and the microbiome. Our gut has neurons and is considered by many researchers to be a second brain. When we add living microbiology to our system, we are literally changing the information processing happening in all three of our minds: gut, heart, and head. That is why we call these potions - they have the ability to transform how we think, see, and relate to our world.",
        "rewards": {"regen": 111, "rvoice": 1},
        "deliverable": "A Showcasing my Potions video or article",
        "estimatedTime": "3-5 hours",
        "steps": [
            {"step": 1, "title": "Make Your Potion", "description": "Follow along with the video to make your potion!"},
            {"step": 2, "title": "Select Your Potions", "description": "Select 1-3 potions you want to showcase."},
            {"step": 3, "title": "Document Your Practice", "description": "Create content showing how you prepared your potion."},
            {"step": 4, "title": "Share Your Creation", "description": "Explain the benefits and how others might incorporate these practices. Include any immediate effects or lessons."},
            {"step": 5, "title": "Submit Your Showcase", "description": "Upload your video or article to your social media and use your link to add to your proposal to our Game Space."}
        ],
        "resources": [{"title": "Watch Potions Tutorial Video", "url": "https://www.youtube.com/watch?v=pbhGgg2GZUM"}],
        "tips": ["Focus on what you actually practice, not just theory", "Include practical tips others can use", "Share both the process and the results"]
    },
    {
        "filename": "quest-02-seeds",
        "title": "Quest 2: Seeds",
        "subtitle": "Planting Abundance",
        "storyCard": "The Seeds quest builds the practice of saving, documenting, and swapping seeds. We become participants in the oldest continuous human technology: the preservation of genetic diversity through care and attention. Every seed saved is a vote for biodiversity, for local food sovereignty, and for a future where communities feed themselves from their own land.",
        "rewards": {"regen": 22, "rvoice": 1},
        "deliverable": "Adding seeds to swap in your LocalScale profile",
        "estimatedTime": "1-2 hours",
        "steps": [
            {"step": 1, "title": "Gather Your Seeds", "description": "Collect seeds from plants you have grown, traded, or purchased. Consider heirloom and open-pollinated varieties."},
            {"step": 2, "title": "Document Your Collection", "description": "Take photos and note the variety, source, and any growing tips for each seed type."},
            {"step": 3, "title": "Create Your Profile", "description": "Set up or update your LocalScale profile with your seed offerings."},
            {"step": 4, "title": "List for Swap", "description": "Add your seeds to the swap marketplace with clear descriptions."},
            {"step": 5, "title": "Connect and Trade", "description": "Reach out to other seed savers and arrange swaps."}
        ],
        "resources": [{"title": "LocalScale Platform", "url": "https://localscale.org"}],
        "tips": ["Include growing zone information", "Share stories about where seeds came from", "Consider offering seed saving workshops"]
    },
    {
        "filename": "quest-03-healing-wholes",
        "title": "Quest 3: Healing Whole",
        "subtitle": "Holistic Wellness",
        "storyCard": "The Healing Whole quest is about creating spaces of deep healing in our Earth - digging holes, composting, working with fungi, building the soil microbiome that will receive our seeds and our food. The soil becomes a literal extension of our digestive system. What we put into the ground, we eventually put into ourselves. Healing the soil and healing our bodies are the same act.",
        "rewards": {"regen": 111, "rvoice": 1},
        "deliverable": "Showcasing my Healing Whole video or article",
        "estimatedTime": "3-5 hours",
        "steps": [
            {"step": 1, "title": "Prepare Your Space", "description": "Choose a patch of earth to work with. It could be a garden bed, a forest floor, or a community space."},
            {"step": 2, "title": "Dig and Aerate", "description": "Work with the soil. Dig holes, break up compaction, introduce air and water pathways."},
            {"step": 3, "title": "Compost and Inoculate", "description": "Add compost, biochar, or fungal inoculants to enrich the microbial community."},
            {"step": 4, "title": "Document Your Process", "description": "Photograph before and after. Note what you added and why."},
            {"step": 5, "title": "Reflect and Share", "description": "Share your experience. What did you learn about soil? About yourself?"}
        ],
        "tips": ["Be vulnerable and authentic", "Include both challenges and breakthroughs", "Invite others to share their experiences"]
    },
    {
        "filename": "quest-04-food-foresting",
        "title": "Food Foresting: Being Human Again",
        "subtitle": "Turning Earth into a Food Forest",
        "storyCard": "When we do the Food Foresting quest after the Potions quest, we hold fruit seeds in our mouths for several minutes before planting them. The saliva that now coats those seeds carries a vastly richer diversity of microbial life than it did before. We are literally seeding the Earth with the expanded ecosystem of our own body. Our DNA, our biology, our relationship to the land - encoded in every seed we plant.",
        "rewards": {"regen": 33, "rvoice": 1},
        "deliverable": "A short video and/or written article",
        "estimatedTime": "2-4 hours",
        "steps": [
            {"step": 1, "title": "Gather Your Crew", "description": "Invite friends, family, or community members to join you on this adventure."},
            {"step": 2, "title": "Source Your Seeds and Seedlings", "description": "Collect fruit tree seeds or small seedlings. Consider native species and what grows well in your area."},
            {"step": 3, "title": "Scout Locations", "description": "Find suitable public spaces, parks, or forest edges where trees can thrive without being disturbed."},
            {"step": 4, "title": "Plant with Intention", "description": "Plant your seeds and seedlings with care. Consider soil conditions, water access, and sunlight."},
            {"step": 5, "title": "Document and Share", "description": "Record your adventure - what you planted, where, and the joy of being human again."},
            {"step": 6, "title": "Submit Your Story", "description": "Share your video or article with the community. Include what you learned and insights gained."}
        ],
        "tips": ["This quest can be done infinite times!", "Choose species that will thrive without maintenance", "Make it a celebration - bring snacks, music, joy", "Mark locations so you can return and check on your trees"]
    },
    {
        "filename": "quest-10-nvc",
        "title": "Quest 10: NVC",
        "subtitle": "Nonviolent Communication",
        "storyCard": "Quest 10 teaches us to speak from needs rather than judgments, to hear others without taking their pain as an attack, and to coordinate meeting shared needs together. This is the bridge from individual healing into collective co-creation. Every governance system, every community, every partnership becomes more functional when the people inside it know how to communicate in this way.",
        "rewards": {"regen": 111, "rvoice": 1},
        "deliverable": "A written reflection, video, or recorded conversation showing your NVC practice",
        "estimatedTime": "1-2 hours initial, then ongoing practice",
        "steps": [
            {"step": 1, "title": "Take the NVC Course", "description": "Find the recommended NVC materials and study them. Online courses, Marshall Rosenberg's books, and free recordings of his workshops are all valid starting points."},
            {"step": 2, "title": "Practice the Four Components", "description": "Observation, Feeling, Need, Request. Apply them in your daily conversations. Start with low-stakes situations before bringing them into high-stakes ones."},
            {"step": 3, "title": "Find a Practice Partner", "description": "NVC practiced alone is limited. Find someone else to study and practice with. Many cities have NVC practice circles, or find a partner in our forum."},
            {"step": 4, "title": "Apply in a Real Situation", "description": "Bring NVC into a genuine conflict or tension in your life. Not to win. To connect."},
            {"step": 5, "title": "Reflect and Share", "description": "Write or record a reflection on what you learned. What shifted? Where did it get hard? What would you tell someone just starting?"},
            {"step": 6, "title": "Attend or Host a Community Session", "description": "The forum has regular NVC discussion threads. Participate. If there is no session happening, start one."}
        ],
        "resources": [
            {"title": "NVC Academy", "url": "https://nvctraining.com"},
            {"title": "Gabor Mate on trauma and communication", "url": "https://www.youtube.com/playlist?list=PL3Xi8vZSmBTRlD8Dnx6a16yeBTaSxKNdS"}
        ],
        "tips": [
            "The hardest part is distinguishing observations from evaluations. Practice this first.",
            "Saying I feel like you do not care is not a feeling - it is an interpretation. I feel hurt and lonely is a feeling.",
            "Gratitude is also NVC. Practice expressing gratitude in terms of what needs were met."
        ]
    }
]

outdir = "public/quest-guides"
os.makedirs(outdir, exist_ok=True)
for q in QUESTS:
    build_pdf(outdir, q)
print("All PDFs generated successfully.")
