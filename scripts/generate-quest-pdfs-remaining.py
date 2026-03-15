"""
generate-quest-pdfs-remaining.py
Generates Quest Field Guide PDFs for quests 5-13 (the remaining ones).
Output: client/public/quest-guides/

Usage:
  pip install reportlab
  python scripts/generate-quest-pdfs-remaining.py
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
    KeepTogether, ListFlowable, ListItem
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# ─── Colour palette ───────────────────────────────────────────────────────────
FOREST_DARK   = colors.HexColor("#1a472a")
FOREST_MID    = colors.HexColor("#4a7c59")
FOREST_LIGHT  = colors.HexColor("#7dd87d")
CREAM         = colors.HexColor("#f5f0e8")
WARM_BROWN    = colors.HexColor("#d4a574")
TEXT_DARK     = colors.HexColor("#1a1a1a")
TEXT_MID      = colors.HexColor("#3a3a3a")

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "client", "public", "quest-guides")
os.makedirs(OUT_DIR, exist_ok=True)

# ─── Styles ───────────────────────────────────────────────────────────────────
def build_styles():
    base = getSampleStyleSheet()
    styles = {}

    styles["cover_title"] = ParagraphStyle(
        "cover_title", fontName="Helvetica-Bold", fontSize=28, leading=34,
        textColor=colors.white, alignment=TA_CENTER, spaceAfter=6)
    styles["cover_subtitle"] = ParagraphStyle(
        "cover_subtitle", fontName="Helvetica", fontSize=14, leading=18,
        textColor=FOREST_LIGHT, alignment=TA_CENTER, spaceAfter=4)
    styles["cover_badge"] = ParagraphStyle(
        "cover_badge", fontName="Helvetica-Bold", fontSize=10, leading=14,
        textColor=WARM_BROWN, alignment=TA_CENTER, spaceAfter=2)
    styles["section_heading"] = ParagraphStyle(
        "section_heading", fontName="Helvetica-Bold", fontSize=13, leading=17,
        textColor=FOREST_DARK, spaceBefore=16, spaceAfter=6)
    styles["body"] = ParagraphStyle(
        "body", fontName="Helvetica", fontSize=10, leading=15,
        textColor=TEXT_DARK, spaceAfter=6)
    styles["story"] = ParagraphStyle(
        "story", fontName="Helvetica-Oblique", fontSize=10, leading=15,
        textColor=FOREST_DARK, leftIndent=12, rightIndent=12, spaceAfter=6)
    styles["step_num"] = ParagraphStyle(
        "step_num", fontName="Helvetica-Bold", fontSize=10, leading=14,
        textColor=FOREST_LIGHT, spaceBefore=8, spaceAfter=2)
    styles["step_body"] = ParagraphStyle(
        "step_body", fontName="Helvetica", fontSize=10, leading=14,
        textColor=TEXT_DARK, leftIndent=20, spaceAfter=4)
    styles["tip"] = ParagraphStyle(
        "tip", fontName="Helvetica", fontSize=9, leading=13,
        textColor=TEXT_MID, leftIndent=16, spaceAfter=3)
    styles["resource"] = ParagraphStyle(
        "resource", fontName="Helvetica", fontSize=9, leading=13,
        textColor=FOREST_DARK, leftIndent=12, spaceAfter=3)
    styles["reward_box"] = ParagraphStyle(
        "reward_box", fontName="Helvetica-Bold", fontSize=11, leading=15,
        textColor=colors.white, alignment=TA_CENTER, spaceAfter=2)
    styles["footer"] = ParagraphStyle(
        "footer", fontName="Helvetica", fontSize=8, leading=11,
        textColor=colors.HexColor("#888888"), alignment=TA_CENTER)

    return styles


def cover_block(styles, quest_num, title, subtitle, reward_regen, reward_rvoice, element_icon):
    return [
        Spacer(1, 0.4 * inch),
        Paragraph(element_icon, ParagraphStyle("icon", fontName="Helvetica-Bold",
            fontSize=36, leading=44, textColor=FOREST_LIGHT, alignment=TA_CENTER)),
        Spacer(1, 0.1 * inch),
        Paragraph("ReGen Civics", styles["cover_badge"]),
        Paragraph("Quest Field Guide", styles["cover_badge"]),
        Spacer(1, 0.15 * inch),
        Paragraph(title, styles["cover_title"]),
        Paragraph(subtitle, styles["cover_subtitle"]),
        Spacer(1, 0.2 * inch),
        HRFlowable(width="60%", thickness=1, color=FOREST_LIGHT, hAlign="CENTER"),
        Spacer(1, 0.15 * inch),
        Paragraph(f"+{reward_regen} $ReGen  &bull;  +{reward_rvoice} RGVoice", styles["reward_box"]),
        Spacer(1, 0.05 * inch),
        Paragraph("regencivics.earth", styles["cover_badge"]),
        Spacer(1, 0.3 * inch),
    ]


def section_hr(styles):
    return [HRFlowable(width="100%", thickness=0.5, color=FOREST_LIGHT, spaceAfter=4)]


def journal_lines(count=8):
    lines = []
    for _ in range(count):
        lines.append(Paragraph("_" * 72, ParagraphStyle(
            "jline", fontName="Helvetica", fontSize=9, leading=22,
            textColor=colors.HexColor("#dddddd"))))
    return lines


# ─── Quest builders ───────────────────────────────────────────────────────────

def build_quest_dreaming_spaces(styles):
    cover = cover_block(styles, 5, "Quest 5: Dreaming Spaces of Love",
        "Family Homesteads", 111, 1, "\U0001f3e0")

    return cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "Design, dream, and co-create a space of love — a place where people can truly "
            "arrive. Your home, garden, an outdoor corner, or a community gathering space. "
            "Transform it into somewhere that invites rest, connection, and genuine presence.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "Most of us have spent so little time in spaces that were designed for us to "
            "actually rest, connect, and feel held. We have inherited an architecture of "
            "efficiency. Offices, rental apartments, generic furniture, overhead lighting, "
            "no nature, no quiet. A space of love is not expensive or elaborate. It is "
            "intentional. It holds the needs of the people inside it: warmth, beauty, places "
            "to sit together, some living thing growing nearby, enough quiet to actually hear "
            "each other. It is somewhere that when you enter it, your shoulders drop.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Reflect on what rest and love actually require.", styles["step_num"]),
        Paragraph("Where do you feel most at home in the world? What does that place have "
                  "that others lack? Write your answers down.", styles["step_body"]),
        Paragraph("Step 2: Choose a space to work with.", styles["step_num"]),
        Paragraph("Pick somewhere you have access to and some ability to shape. Your home, "
                  "a community space, an outdoor area. Start where you have permission.", styles["step_body"]),
        Paragraph("Step 3: Identify what the space currently lacks.", styles["step_num"]),
        Paragraph("Walk through it slowly. Notice the light, air, surfaces, sounds, smells. "
                  "What does it invite? What does it make impossible?", styles["step_body"]),
        Paragraph("Step 4: Dream it into something different.", styles["step_num"]),
        Paragraph("Sketch, write, or vision-board what this space could be. Bring in natural "
                  "materials, living plants, comfortable seating arranged for conversation.", styles["step_body"]),
        Paragraph("Step 5: Do at least one physical act of transformation.", styles["step_num"]),
        Paragraph("Rearrange, plant, build, or clear something. Document the before and after.", styles["step_body"]),
        Paragraph("Step 6: Use the space with others.", styles["step_num"]),
        Paragraph("Gather someone you care about in this space. Share a meal, a conversation, "
                  "or simply time. Notice how the space affects what becomes possible between you.", styles["step_body"]),
        Paragraph("Step 7: Document and share.", styles["step_num"]),
        Paragraph("Create a short piece showing your space and what you learned from building "
                  "and using it.", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("A documented space transformation with reflection on what changed in how "
                  "people related inside it.", styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• The single biggest change in most indoor spaces: add living plants and "
                  "remove overhead fluorescent light.", styles["tip"]),
        Paragraph("• A space that invites connection faces seats toward each other, not toward a screen.", styles["tip"]),
        Paragraph("• Outdoor spaces count. A fire circle, a garden corner, a hammock grove.", styles["tip"]),
        Paragraph("• Include something for the senses beyond sight: a scent, texture, sound of water.", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• The Timeless Way of Building by Christopher Alexander", styles["resource"]),
        Paragraph("• Pattern Language research for human-scale spaces", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("What did your space transformation open up?", styles["body"]),
    ] + journal_lines(14)


def build_quest_rites_of_love(styles):
    cover = cover_block(styles, 6, "Quest 6: Rites of Love",
        "We Are the Land", 99, 1, "\u2764\ufe0f")

    return cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "Design and practice rites that sustain love across time. Not routines — rites. "
            "Intentional practices that create a rhythm love can anchor to. For your partner, "
            "friends, family, community, or your relationship to a place.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "Love needs tending. Not just feeling, but practice. Most of us were never taught "
            "the practices that sustain love across years and decades. Rites are different from "
            "routines. A routine is something you do on autopilot. A rite is something you do "
            "with attention, marking it as significant. When you light a candle for a shared "
            "meal, when you build a fire together at the change of a season, when you find your "
            "way back to each other after a rupture — these are rites. Every healthy culture "
            "has had rites of love. Most of those structures have dissolved in modern life, "
            "and we have not replaced them with anything.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Map the love relationships in your life.", styles["step_num"]),
        Paragraph("Partner, friends, family, community, relationship to a place. Choose one "
                  "or two to focus on for this quest.", styles["step_body"]),
        Paragraph("Step 2: Identify where rites are already present.", styles["step_num"]),
        Paragraph("Even informally. A morning exchange. An annual gathering. A way of greeting. "
                  "Note what exists and what it does for the relationship.", styles["step_body"]),
        Paragraph("Step 3: Identify where rites are absent but needed.", styles["step_num"]),
        Paragraph("Where does your relationship lack structure for the difficult moments? "
                  "For celebration? For repair?", styles["step_body"]),
        Paragraph("Step 4: Design at least one new rite.", styles["step_num"]),
        Paragraph("Keep it simple and honest to who you are. A weekly check-in, a seasonal "
                  "celebration, a repair practice for after conflict, a way of marking gratitude.", styles["step_body"]),
        Paragraph("Step 5: Practice it.", styles["step_num"]),
        Paragraph("Do it at least three times before submitting. Note how it changes the relationship.", styles["step_body"]),
        Paragraph("Step 6: Reflect and share.", styles["step_num"]),
        Paragraph("Write or record a reflection on what you built, what it felt like to practice "
                  "it, and what it opened up.", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("A written or recorded reflection on the rite you designed, practiced, and "
                  "what it changed.", styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• The simplest rites are often the most durable. A weekly walk with a friend is a rite.", styles["tip"]),
        Paragraph("• Repair is the most important rite. Every relationship breaks at some point.", styles["tip"]),
        Paragraph("• Rites of place are often overlooked. Visiting land seasonally, tending a tree.", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• The Five Love Languages by Gary Chapman", styles["resource"]),
        Paragraph("• Braiding Sweetgrass by Robin Wall Kimmerer (rites of love with the land)", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("The rite you are designing and practicing:", styles["body"]),
    ] + journal_lines(14)


def build_quest_healing_circles(styles):
    cover = cover_block(styles, 7, "Quest 7: Healing Circles",
        "Community Gathering", 144, 1, "\U0001f9f8")

    return cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "Gather 10+ humans in a held circle to witness each other honestly — without advice, "
            "without fixing, without performing. An ancient technology for genuine presence and "
            "collective healing. Share whatever healing modality you are most aligned with.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "Most of what passes for support in our culture is advice. Someone shares something "
            "painful and the person listening immediately starts solving it. The result is that "
            "the person sharing feels even more alone, because what they needed was not a solution. "
            "They needed to be witnessed. A healing circle is a different technology. Structured. "
            "Held. Ancient. When everyone can see everyone else, hierarchy dissolves. The quality "
            "of attention is different. The depth of what people are willing to say is different. "
            "And what happens after, in how the people relate to each other, is different.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Study the basics of circle-holding.", styles["step_num"]),
        Paragraph("Read at least one resource on facilitation or circle practice. Understand "
                  "the difference between advising and witnessing, between fixing and holding.", styles["step_body"]),
        Paragraph("Step 2: Design your circle.", styles["step_num"]),
        Paragraph("Who will you gather? What is the container? What is the opening, the "
                  "talking-object structure, the closing?", styles["step_body"]),
        Paragraph("Step 3: Set agreements with the group before you start.", styles["step_num"]),
        Paragraph("Minimum agreements: confidentiality, no advice unless asked, speak from "
                  "your own experience, listen to understand. Read these aloud at the opening.", styles["step_body"]),
        Paragraph("Step 4: Hold the circle.", styles["step_num"]),
        Paragraph("Let each person speak without interruption. Pause after each share. Invite "
                  "the group to be with what was shared before moving on. Do not fill the silence.", styles["step_body"]),
        Paragraph("Step 5: Close with intention.", styles["step_num"]),
        Paragraph("End with a brief closing round: one word or sentence from each person "
                  "about what they are leaving with.", styles["step_body"]),
        Paragraph("Step 6: Reflect and share.", styles["step_num"]),
        Paragraph("After the circle, write or record a reflection on how it went. What worked? "
                  "What did you learn about holding space?", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("Documentation of a healing circle you held: the structure you used, what "
                  "happened, and your reflection as the holder.", styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• Your first circle will not be perfect. Hold it anyway.", styles["tip"]),
        Paragraph("• The most common mistake: talking too much as the facilitator.", styles["tip"]),
        Paragraph("• Circles work best with 4-12 people. Larger than 12 becomes hard to hold.", styles["tip"]),
        Paragraph("• Outdoor circles around fire are particularly powerful.", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• The Way of Council by Jack Zimmerman and Virginia Coyle", styles["resource"]),
        Paragraph("• Nonviolent Communication by Marshall Rosenberg", styles["resource"]),
        Paragraph("• Joanna Macy's Work That Reconnects", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("Notes from your circle design and reflection:", styles["body"]),
    ] + journal_lines(14)


def build_quest_wild_foraging(styles):
    cover = cover_block(styles, 8, "Quest 8: Wild Foraging",
        "Deep Nourishment", 111, 1, "\U0001f344")

    return cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "Forage mushrooms, medicinal herbs, berries, and tree magic. Learn to read the "
            "land around you, harvest with reciprocity, and nourish your body with food that "
            "grew in real soil, in real weather, in your own bioregion.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "For most of human history, people knew the land around them intimately. They knew "
            "which plants healed and which harmed, which fungi fruited after rain. That knowledge "
            "lived in people, passed through hands and seasons and walking together. In a generation "
            "or two, most of it was lost. Wild foods carry things that cultivated foods do not: "
            "biodiversity in the microbiome they arrive with, compounds that plants produce in "
            "real ecological competition. Beyond the nutrition, foraging changes your relationship "
            "to a place. When you learn what grows where, the land is no longer scenery. "
            "It is a conversation.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Learn your bioregion's wild edible landscape.", styles["step_num"]),
        Paragraph("Start with 5-10 plants or fungi you can identify with certainty. Use local "
                  "field guides. Join a local foraging walk. Certainty matters — do not eat "
                  "anything you cannot identify with confidence.", styles["step_body"]),
        Paragraph("Step 2: Go out at least three times over at least two weeks.", styles["step_num"]),
        Paragraph("Foraging as a single experience gives you little. Going out across different "
                  "weather and terrain begins to give you a sense of patterns.", styles["step_body"]),
        Paragraph("Step 3: Harvest with intention.", styles["step_num"]),
        Paragraph("Take no more than a third of any plant in a given area. Leave the rest to "
                  "seed, recover, and feed others. Where possible, give something back.", styles["step_body"]),
        Paragraph("Step 4: Prepare and eat what you have found.", styles["step_num"]),
        Paragraph("Cook or use your harvest. Note the difference in taste, texture, and how "
                  "your body responds compared to store-bought equivalents.", styles["step_body"]),
        Paragraph("Step 5: Document your finds.", styles["step_num"]),
        Paragraph("Photos of each species in situ. Notes on where, when, condition, what you "
                  "did with it. Build a personal field record.", styles["step_body"]),
        Paragraph("Step 6: Share your harvest and knowledge.", styles["step_num"]),
        Paragraph("Cook for others using what you found. Share your field record. Teach "
                  "someone one thing you learned.", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("A field record (photos + notes) of your foraging sessions and a reflection "
                  "on what changed in your relationship to the land.", styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• Three non-negotiables: local field guide, local expertise, and the rule "
                  "that you eat only what you can identify with full certainty.", styles["tip"]),
        Paragraph("• Start with the most distinctive plants: blackberries, elderberries, nettles, "
                  "dandelions are good starting points in most temperate regions.", styles["tip"]),
        Paragraph("• Fall is best for fungi in most temperate climates. Spring is best for many greens.", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• A local field guide for your bioregion (not generic worldwide guides)", styles["resource"]),
        Paragraph("• iNaturalist app (species identification and community verification)", styles["resource"]),
        Paragraph("• Search for a local foraging community, club, or walk in your city", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("Species found, locations, what you did with them:", styles["body"]),
    ] + journal_lines(14)


def build_quest_medicine_journey(styles):
    cover = cover_block(styles, 9, "Quest 9: Medicine Journey",
        "Inner Exploration", 222, 1, "\U0001f300")

    return cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "An intentional inner journey — plant medicine ceremony, vision quest, fasting "
            "retreat, extended meditation intensive, sweat lodge, or dark retreat. Whatever "
            "form you choose, what matters is that it is intentional, supported, and integrated.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "Something happens when a person goes deep enough into themselves that they cannot "
            "maintain the story they have been telling. The scaffolding comes down. And in that "
            "space, things become visible that ordinary consciousness keeps behind glass. These "
            "practices have been used by cultures around the world for thousands of years to "
            "facilitate healing, initiation, and contact with deeper dimensions of reality. "
            "They are not entertainment. They are not shortcuts. Used well, they are among the "
            "most powerful catalysts for transformation available to a human being. Integration "
            "is the work of taking what you found in the depths and actually living differently "
            "because of it.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Choose your practice.", styles["step_num"]),
        Paragraph("Identify the form of inner journey you are called to. If working with plant "
                  "medicines, ensure you are doing so legally, with ceremonial support, and with "
                  "clear intention.", styles["step_body"]),
        Paragraph("Step 2: Prepare intentionally.", styles["step_num"]),
        Paragraph("Preparation is not just dietary. Clear your calendar, tell the people close "
                  "to you what you are doing, set a clear intention. Write your intention down.", styles["step_body"]),
        Paragraph("Step 3: Enter with good support.", styles["step_num"]),
        Paragraph("A genuine guide or facilitator matters enormously. Someone who has walked "
                  "this path many times and knows how to hold space for what arises.", styles["step_body"]),
        Paragraph("Step 4: Come back with care.", styles["step_num"]),
        Paragraph("The first 24-72 hours after a deep journey are critical. Protect them. "
                  "Do not rush back to work, screens, or social situations. Rest. Write. Walk.", styles["step_body"]),
        Paragraph("Step 5: Integrate over time.", styles["step_num"]),
        Paragraph("Genuine integration takes weeks to months. Journal regularly. Talk with "
                  "someone who can hold the complexity. Notice where the experience wants to "
                  "change how you live.", styles["step_body"]),
        Paragraph("Step 6: Create and share your artifact.", styles["step_num"]),
        Paragraph("Write, record, or capture a reflection on your journey and its integration. "
                  "What did you enter with? What did you find? What is different now?", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("A documented reflection on your journey and integration, shared with "
                  "the community.", styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• Preparation determines outcome more than people expect.", styles["tip"]),
        Paragraph("• Your guide or facilitator is the most important decision you make.", styles["tip"]),
        Paragraph("• Integration is not complete when you feel good. It is complete when you "
                  "live differently.", styles["tip"]),
        Paragraph("• Not every journey is blissful. Some of the most important ones are the hardest.", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• Psychedelic Integration Alliance: psychedelicintegration.com", styles["resource"]),
        Paragraph("• Zendo Project (harm reduction): zendoproject.org", styles["resource"]),
        Paragraph("• MAPS research: maps.org", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("Your intention, observations, and integration notes:", styles["body"]),
    ] + journal_lines(14)


def build_quest_tree_talk(styles):
    cover = cover_block(styles, "9b", "Quest 9b: Tree Talk",
        "Forest Communication", 99, 1, "\U0001f333")

    return cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "Build a real relationship with the trees near you. Not a walk in the woods — "
            "a relationship. Return to the same trees over time. Learn to read what you are "
            "seeing. Develop the habit of genuine attention. Visit at least once a week for "
            "three weeks or more.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "Trees communicate. That sentence would have seemed like poetry thirty years ago. "
            "Now it is science. Suzanne Simard's research showed that trees share carbon, water, "
            "and chemical signals through mycorrhizal networks underground. Old trees support "
            "younger trees. When a tree is stressed, it sends warning compounds through the "
            "network. We are poor at perceiving things that move and communicate at a different "
            "speed than us. But the capacity is there. It just requires slowing down. When you "
            "learn to listen to trees, you also learn something about what it means to listen "
            "to anything that is not shaped like you.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Find your trees.", styles["step_num"]),
        Paragraph("Identify 2-3 trees within easy reach of your daily life. Find at least one "
                  "old tree in the oldest accessible forest or parkland near you.", styles["step_body"]),
        Paragraph("Step 2: Visit regularly.", styles["step_num"]),
        Paragraph("Return to the same trees at least once a week. Same trees. Different weather, "
                  "different light, different states of your own attention.", styles["step_body"]),
        Paragraph("Step 3: Learn to read what you see.", styles["step_num"]),
        Paragraph("Study bark patterns, canopy shape, root surface, presence of fungi and lichen. "
                  "A local tree identification guide helps.", styles["step_body"]),
        Paragraph("Step 4: Practice genuine attention.", styles["step_num"]),
        Paragraph("On at least three visits, spend 20+ minutes doing nothing except being with "
                  "one tree. Sit at its base. Put your hands on the bark. Follow the branches.", styles["step_body"]),
        Paragraph("Step 5: Research the species.", styles["step_num"]),
        Paragraph("How long do they live? How do they reproduce? What animals depend on them? "
                  "What is their relationship to the soil and the water?", styles["step_body"]),
        Paragraph("Step 6: Document your relationship.", styles["step_num"]),
        Paragraph("Keep a field journal across your visits. Photos, observations, sketches. "
                  "What did you notice this week that you did not notice last week?", styles["step_body"]),
        Paragraph("Step 7: Share your account.", styles["step_num"]),
        Paragraph("Write or record a piece about your relationship with these specific trees. "
                  "What did you learn to see? What shifted in how you relate to the living world?", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("A documented account of your relationship with specific trees over at least "
                  "three weeks, including what you learned to see and what changed.", styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• The old-growth forest floor is the most complete expression of a living "
                  "mycorrhizal network you can walk on.", styles["tip"]),
        Paragraph("• Slow down more than you think you need to. Most of what we miss in nature "
                  "we miss because we are moving too fast.", styles["tip"]),
        Paragraph("• Lichen on bark indicates clean air. Bracket fungi at the base indicate root decay.", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• The Hidden Life of Trees by Peter Wohlleben", styles["resource"]),
        Paragraph("• Finding the Mother Tree by Suzanne Simard", styles["resource"]),
        Paragraph("• iNaturalist app for species ID and mycorrhizal research", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("Your tree journal — observations from each visit:", styles["body"]),
    ] + journal_lines(14)


def build_quest_coordination_patterns(styles):
    cover = cover_block(styles, 11, "Quest 11: Coordination Patterns",
        "How We Organize", 177, 1, "\U0001f310")

    return cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "Learn the tools of non-hierarchical group coordination and apply at least one "
            "in a real group. Holacracy, Sociocracy, consent-based governance, circle practice, "
            "commons governance. These patterns have names. They can be learned and applied.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "Every group that tries to work together without a boss eventually hits the same "
            "wall. Who makes the final call? How do you handle disagreement? These are not "
            "unsolvable problems. They are solved, repeatedly, by groups around the world who "
            "have developed specific coordination patterns. The patterns have names. Some groups "
            "burn through them in a year through conflict and collapse, while others spend "
            "generations using them well. The difference is usually whether the patterns were "
            "made explicit before the crisis hit. This quest is about learning those tools and "
            "actually using them in a real group.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Learn the landscape of coordination patterns.", styles["step_num"]),
        Paragraph("Study at least two different approaches to non-hierarchical group coordination: "
                  "Holacracy/Sociocracy, Circle Practice, or Elinor Ostrom's Commons Governance Principles.", styles["step_body"]),
        Paragraph("Step 2: Identify a real group to practice with.", styles["step_num"]),
        Paragraph("A project team, household, community organization, or ReGen Civics group. "
                  "The practice needs real stakes and real people to be useful.", styles["step_body"]),
        Paragraph("Step 3: Introduce at least one coordination pattern.", styles["step_num"]),
        Paragraph("Choose something appropriate to the group's size and maturity: a check-in "
                  "round, a consent decision process, a role-clarity exercise, a retrospective.", styles["step_body"]),
        Paragraph("Step 4: Notice what the pattern does and does not do.", styles["step_num"]),
        Paragraph("Run at least three sessions using the same pattern before evaluating it. "
                  "Ask the group: what worked, what did not, what would we change?", styles["step_body"]),
        Paragraph("Step 5: Document the pattern and your findings.", styles["step_num"]),
        Paragraph("Write up what you did, how the group responded, what the pattern helped "
                  "with, and what it did not address.", styles["step_body"]),
        Paragraph("Step 6: Share your experience.", styles["step_num"]),
        Paragraph("Post your write-up in the forum. Your documented experience is useful to "
                  "others in the game working on the same problems.", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("A documented account of a coordination pattern you introduced and practiced "
                  "in a real group, including reflection on what worked and what you would do differently.",
                  styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• The check-in round is the single most universally useful coordination pattern.", styles["tip"]),
        Paragraph("• Consent is different from consensus. Consent requires no fundamental objection. "
                  "It is much faster and usually better.", styles["tip"]),
        Paragraph("• The most important governance question: how do we make and revisit agreements?", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• Reinventing Organizations by Frederic Laloux", styles["resource"]),
        Paragraph("• The Sociocracy 3.0 Practical Guide: sociocracy30.org (free online)", styles["resource"]),
        Paragraph("• Governing the Commons by Elinor Ostrom", styles["resource"]),
        Paragraph("• NVC by Marshall Rosenberg (communication is the foundation of coordination)", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("The pattern you introduced, how it went, what you learned:", styles["body"]),
    ] + journal_lines(14)


def build_quest_breathplay(styles):
    cover = cover_block(styles, 12, "Quest 12: Breathplay & Future Dreaming",
        "Visioning Together", 111, 1, "\U0001f32a\ufe0f")

    return cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "Use breathwork to access an expanded state, then vision the world 20 years from "
            "now if things go well. Come back with a sensory, specific account of the future "
            "you visited. The futures we can feel our way into are different from the futures "
            "we can only think about.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "The breath is the fastest path to an altered state that most people have access "
            "to right now, without anything else. Extended intentional breathing affects CO2 "
            "and oxygen levels in ways that produce measurable shifts in consciousness: "
            "relaxation of the default mode network, quieting of the internal critic, expansion "
            "of what feels possible. Most people who try to vision a regenerative future end up "
            "listing things: solar panels, permaculture gardens. This is useful but it is not "
            "visioning. Genuine visioning is sensory and specific. You are in a place, in a "
            "time, experiencing something. After a breath session, you can feel your way in.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Learn the basic breathwork approach you will use.", styles["step_num"]),
        Paragraph("Holotropic breathwork, Wim Hof, transformational breathing, or any intentional "
                  "breathing practice you are drawn to. If new to breathwork, start with a guided "
                  "online session before doing a full session alone.", styles["step_body"]),
        Paragraph("Step 2: Prepare your space.", styles["step_num"]),
        Paragraph("A comfortable lying-down space where you will not be interrupted for 45-90 "
                  "minutes. Low light, comfortable temperature. Journal nearby for immediately after.", styles["step_body"]),
        Paragraph("Step 3: Set your intention.", styles["step_num"]),
        Paragraph("You are going into this session to vision a specific future: the world 20 "
                  "years from now, if things go well. Hold that intention lightly as you begin.", styles["step_body"]),
        Paragraph("Step 4: Do a full breathwork session.", styles["step_num"]),
        Paragraph("Follow your chosen method for 30-60 minutes. Let the visioning emerge naturally. "
                  "You may find yourself somewhere unexpected. Go there.", styles["step_body"]),
        Paragraph("Step 5: Write or record immediately after.", styles["step_num"]),
        Paragraph("While the experience is still fresh, capture everything: what you saw, where "
                  "you were, who was there, what it felt like, what surprised you. Do not edit yet.", styles["step_body"]),
        Paragraph("Step 6: Reflect and compose your vision document.", styles["step_num"]),
        Paragraph("After a day or two, return to your notes. Shape them into a coherent account "
                  "of the future you visited. Make it sensory and specific.", styles["step_body"]),
        Paragraph("Step 7: Share it with the community.", styles["step_num"]),
        Paragraph("Your vision is a piece of the collective picture we are building together "
                  "of where we are going.", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("A sensory, specific written or recorded account of a future you visited "
                  "during and after a breathwork session.", styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• If intense emotions arise during breathwork, stay with them. They are releases.", styles["tip"]),
        Paragraph("• The most interesting visions are usually the ones you did not plan.", styles["tip"]),
        Paragraph("• Do not drive for at least a few hours after a deep session.", styles["tip"]),
        Paragraph("• You can do this quest with a partner. One breathes, the other holds space, then switch.", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• Wim Hof Method: wimhofmethod.com", styles["resource"]),
        Paragraph("• Holotropic Breathwork by Stanislav Grof and Christina Grof", styles["resource"]),
        Paragraph("• Inner Journeys podcast or YouTube for guided breathwork sessions", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("Your vision — what did you find?", styles["body"]),
    ] + journal_lines(14)


def build_quest_fasting(styles):
    cover = cover_block(styles, 13, "Quest 13: Fasting",
        "Regenerative Ikigai", 77, 1, "\U0001f9d8")

    return cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "A minimum 3-day water fast to access the clarity, autophagy, and altered states "
            "that extended fasting produces. Return to this quest whenever you need to reset "
            "and rediscover your role in the regenerative movement. "
            "Repeatable — earns tokens every time with no limit.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "The body knows how to heal itself. What it needs, more often than any supplement "
            "or intervention, is time to stop processing long enough to do the work. When you "
            "fast, digestion stops. That energy gets redirected. Autophagy kicks in: cells break "
            "down and recycle damaged components. Cellular cleanup the body cannot do while "
            "busy digesting. This is not fringe science — the 2016 Nobel Prize in Physiology "
            "was awarded for autophagy research. Around day three, something shifts. The hunger "
            "quiets. The mind gets cleaner. There is a clarity that is hard to describe until "
            "you have been there. The minimum for this quest is a clean 3-day water fast. "
            "That is the threshold where something real opens up.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Choose your fast.", styles["step_num"]),
        Paragraph("Minimum for this quest: a clean 3-day water fast (water and herbal tea only, "
                  "no calories). If you can extend beyond 3 days, do. Set your intention clearly.", styles["step_body"]),
        Paragraph("Step 2: Prepare your body.", styles["step_num"]),
        Paragraph("In the days before a longer fast, reduce processed foods, sugar, and caffeine "
                  "gradually. A clean transition reduces discomfort significantly.", styles["step_body"]),
        Paragraph("Step 3: Prepare your environment.", styles["step_num"]),
        Paragraph("Tell the people around you what you are doing. Clear your schedule. Have water, "
                  "herbal tea, and electrolytes available. Make sure you have somewhere to rest.", styles["step_body"]),
        Paragraph("Step 4: Fast with intention.", styles["step_num"]),
        Paragraph("Note how you are feeling at the start, middle, and end. What is your energy? "
                  "Mood? Clarity? Relationship to hunger? Hunger comes in waves. When it comes, "
                  "observe it. It passes.", styles["step_body"]),
        Paragraph("Step 5: Break your fast gently.", styles["step_num"]),
        Paragraph("Start with fruit, diluted juice, or broth. Give your digestive system a day "
                  "to rebuild before returning to normal meals.", styles["step_body"]),
        Paragraph("Step 6: Write your reflection.", styles["step_num"]),
        Paragraph("Each time you complete a fast, write a brief account. What happened in your "
                  "body? In your mind? What did you notice that surprised you?", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("A reflection document for each completed fast: dates, duration, key "
                  "observations, and what shifted.", styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• The hardest part of any fast is the first 4-6 hours. Once past that, "
                  "hunger becomes more manageable and clarity begins.", styles["tip"]),
        Paragraph("• Extended fasting requires electrolytes. Add a small amount of salt and "
                  "potassium to your water on days 2 and beyond.", styles["tip"]),
        Paragraph("• People with diabetes, eating disorder history, or pregnancy should consult "
                  "a doctor before fasting.", styles["tip"]),
        Paragraph("• This quest is repeatable with no limit. Each fast earns tokens.", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• The Complete Guide to Fasting by Jason Fung", styles["resource"]),
        Paragraph("• Fasting and Eating for Health by Joel Fuhrman", styles["resource"]),
        Paragraph("• Dr. Valter Longo's research on longevity and fasting", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("Fast log — dates, duration, observations:", styles["body"]),
    ] + journal_lines(14)


# ─── Main ─────────────────────────────────────────────────────────────────────

QUESTS = [
    ("quest-05-dreaming-spaces.pdf",        build_quest_dreaming_spaces,     "Quest 5: Dreaming Spaces of Love — Field Guide"),
    ("quest-06-rites-of-love.pdf",          build_quest_rites_of_love,       "Quest 6: Rites of Love — Field Guide"),
    ("quest-07-healing-circles.pdf",        build_quest_healing_circles,     "Quest 7: Healing Circles — Field Guide"),
    ("quest-08-wild-foraging.pdf",          build_quest_wild_foraging,       "Quest 8: Wild Foraging — Field Guide"),
    ("quest-09-medicine-journey.pdf",       build_quest_medicine_journey,    "Quest 9: Medicine Journey — Field Guide"),
    ("quest-09b-tree-talk.pdf",             build_quest_tree_talk,           "Quest 9b: Tree Talk — Field Guide"),
    ("quest-11-coordination-patterns.pdf",  build_quest_coordination_patterns, "Quest 11: Coordination Patterns — Field Guide"),
    ("quest-12-breathplay.pdf",             build_quest_breathplay,          "Quest 12: Breathplay & Future Dreaming — Field Guide"),
    ("quest-13-fasting.pdf",                build_quest_fasting,             "Quest 13: Fasting — Field Guide"),
]


def main():
    styles = build_styles()

    for filename, builder, title in QUESTS:
        out_path = os.path.join(OUT_DIR, filename)
        print(f"Generating {filename} ...")

        story = builder(styles)

        doc = SimpleDocTemplate(
            out_path,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.85 * inch,
            bottomMargin=0.75 * inch,
            title=title,
            author="ReGen Civics",
            subject="Quest Field Guide",
        )

        def make_page_fn(t):
            def page_fn(canvas, doc):
                canvas.saveState()
                canvas.setFillColor(FOREST_DARK)
                canvas.rect(0, letter[1] - 0.55 * inch, letter[0], 0.55 * inch, fill=1, stroke=0)
                canvas.setFillColor(FOREST_LIGHT)
                canvas.setFont("Helvetica-Bold", 8)
                canvas.drawString(0.75 * inch, letter[1] - 0.32 * inch, f"ReGen Civics  |  {t}")
                canvas.setFillColor(colors.white)
                canvas.setFont("Helvetica", 8)
                canvas.drawRightString(letter[0] - 0.75 * inch, letter[1] - 0.32 * inch,
                                       "regencivics.earth")
                canvas.setFillColor(colors.HexColor("#888888"))
                canvas.setFont("Helvetica", 7.5)
                canvas.drawCentredString(letter[0] / 2, 0.4 * inch,
                                         f"Page {doc.page}  |  ReGen Civics Quest Field Guide  |  regencivics.earth")
                canvas.restoreState()
            return page_fn

        fn = make_page_fn(title)
        doc.build(story, onFirstPage=fn, onLaterPages=fn)
        print(f"  -> {out_path}")

    print(f"\nDone. {len(QUESTS)} PDFs written to {OUT_DIR}")


if __name__ == "__main__":
    main()
