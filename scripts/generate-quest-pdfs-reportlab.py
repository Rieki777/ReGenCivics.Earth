"""
generate-quest-pdfs-reportlab.py
Generates Quest Field Guide PDFs for ReGen Civics.
Output: client/public/quest-guides/

Usage:
  pip install reportlab
  python scripts/generate-quest-pdfs-reportlab.py
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
        "cover_title",
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=34,
        textColor=colors.white,
        alignment=TA_CENTER,
        spaceAfter=6,
    )
    styles["cover_subtitle"] = ParagraphStyle(
        "cover_subtitle",
        fontName="Helvetica",
        fontSize=14,
        leading=18,
        textColor=FOREST_LIGHT,
        alignment=TA_CENTER,
        spaceAfter=4,
    )
    styles["cover_badge"] = ParagraphStyle(
        "cover_badge",
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=WARM_BROWN,
        alignment=TA_CENTER,
        spaceAfter=2,
    )
    styles["section_heading"] = ParagraphStyle(
        "section_heading",
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=FOREST_DARK,
        spaceBefore=16,
        spaceAfter=6,
    )
    styles["body"] = ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=10,
        leading=15,
        textColor=TEXT_DARK,
        spaceAfter=6,
    )
    styles["story"] = ParagraphStyle(
        "story",
        fontName="Helvetica-Oblique",
        fontSize=10,
        leading=15,
        textColor=FOREST_DARK,
        leftIndent=12,
        rightIndent=12,
        spaceAfter=6,
    )
    styles["step_num"] = ParagraphStyle(
        "step_num",
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=FOREST_LIGHT,
        spaceBefore=8,
        spaceAfter=2,
    )
    styles["step_body"] = ParagraphStyle(
        "step_body",
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=TEXT_DARK,
        leftIndent=20,
        spaceAfter=4,
    )
    styles["tip"] = ParagraphStyle(
        "tip",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=TEXT_MID,
        leftIndent=16,
        spaceAfter=3,
    )
    styles["resource"] = ParagraphStyle(
        "resource",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=FOREST_DARK,
        leftIndent=12,
        spaceAfter=3,
    )
    styles["reward_box"] = ParagraphStyle(
        "reward_box",
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.white,
        alignment=TA_CENTER,
        spaceAfter=2,
    )
    styles["footer"] = ParagraphStyle(
        "footer",
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#888888"),
        alignment=TA_CENTER,
    )
    styles["journal_line"] = ParagraphStyle(
        "journal_line",
        fontName="Helvetica",
        fontSize=9,
        leading=22,
        textColor=colors.HexColor("#cccccc"),
    )

    return styles


# ─── Cover page builder ───────────────────────────────────────────────────────
def cover_block(styles, quest_num, title, subtitle, reward_regen, reward_rvoice, element_icon):
    from reportlab.platypus import Table, TableStyle
    from reportlab.lib.units import inch

    items = [
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
    return items


def section_hr(styles):
    return [HRFlowable(width="100%", thickness=0.5, color=FOREST_LIGHT, spaceAfter=4)]


def journal_lines(count=8):
    """Blank ruled lines for journaling."""
    lines = []
    for _ in range(count):
        lines.append(Paragraph("_" * 72, ParagraphStyle(
            "jline", fontName="Helvetica", fontSize=9, leading=22,
            textColor=colors.HexColor("#dddddd"))))
    return lines


# ─── Page template (green header band) ───────────────────────────────────────
def make_doc(filepath, quest_num, title):
    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.85 * inch,
        bottomMargin=0.75 * inch,
        title=title,
        author="ReGen Civics",
        subject="Quest Field Guide",
    )

    def header_footer(canvas, doc):
        canvas.saveState()
        # Header band
        canvas.setFillColor(FOREST_DARK)
        canvas.rect(0, letter[1] - 0.55 * inch, letter[0], 0.55 * inch, fill=1, stroke=0)
        canvas.setFillColor(FOREST_LIGHT)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawString(0.75 * inch, letter[1] - 0.32 * inch, f"ReGen Civics  |  {title}")
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.white)
        canvas.drawRightString(letter[0] - 0.75 * inch, letter[1] - 0.32 * inch,
                               "regencivics.earth")
        # Footer
        canvas.setFillColor(colors.HexColor("#888888"))
        canvas.setFont("Helvetica", 7.5)
        canvas.drawCentredString(letter[0] / 2, 0.4 * inch,
                                 f"Page {doc.page}  |  ReGen Civics Quest Field Guide  |  regencivics.earth")
        canvas.restoreState()

    doc.build_with_fn = lambda story: doc.build(story, onFirstPage=header_footer,
                                                 onLaterPages=header_footer)
    return doc


# ─── Individual quest builders ────────────────────────────────────────────────

def build_quest_fire(styles):
    cover = cover_block(styles, 0, "Quest 0: Fire",
        "Letting Burn What No Longer Serves", 111, 1, "🔥")

    story = cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "The entry point to the Infinite Game. Before we build anything new, we clear. "
            "Fire transmutes instantly. Stories, maladaptations, and perspectives that no longer "
            "serve us can be released in a single ceremony. This quest is your starting point — "
            "the you before the journey began.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "We start with the fire. We live in a time when it is getting harder and harder to "
            "know what is real. More effective and more personalized propaganda means the logical "
            "mind alone cannot keep up. Fire offers a different path: discerning truth directly, "
            "from our own relationship to ourselves and to life. Who are you? Like the rest of us — "
            "nobody. And like the rest of us, a whole person on a path to remembering that wholeness. "
            "The fire is where that remembering begins.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Sit with fire.", styles["step_num"]),
        Paragraph("Literally if you can. A candle works. A fire pit is better. Spend at least "
                  "20-30 minutes just watching it. Let your mind wander. Do not try to think "
                  "productively. Just be with the fire.", styles["step_body"]),
        Paragraph("Step 2: Journal without editing.", styles["step_num"]),
        Paragraph("Write for at least 20 minutes without stopping. What are you carrying that "
                  "is no longer yours? What stories have you inherited that you did not choose? "
                  "What would you burn if you could? What lights you up?", styles["step_body"]),
        Paragraph("Step 3: Identify what to release.", styles["step_num"]),
        Paragraph("From what you wrote, identify 1-3 things you are genuinely ready to release. "
                  "A belief. A story. A pattern. A role. Write each one on a piece of paper.", styles["step_body"]),
        Paragraph("Step 4: Burn it.", styles["step_num"]),
        Paragraph("Safely and with intention. Speak each thing aloud as you offer it to the fire. "
                  "Take your time.", styles["step_body"]),
        Paragraph("Step 5: Write your fire.", styles["step_num"]),
        Paragraph("After the burning, write freely about what you are moving toward. What you want "
                  "to build. What lights you up. What you would do if the old story were truly gone.", styles["step_body"]),
        Paragraph("Step 6: Create and share.", styles["step_num"]),
        Paragraph("Turn your fire story into a video (3 minutes or less), a written piece, or a "
                  "voice recording. Share it with the community. Then submit in the Game Space to "
                  "claim your tokens.", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("A video, article, or voice recording sharing your fire and what you released.",
                  styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• Be real. The community can tell the difference between a genuine fire and a performance.",
                  styles["tip"]),
        Paragraph("• If you find it hard to name what to release, start with something small.",
                  styles["tip"]),
        Paragraph("• You can return to this quest. Burning is not a one-time act. Many players do "
                  "a fire ceremony each season.", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• Watch intro video: youtube.com/watch?v=U5ZTTy0SCaA", styles["resource"]),
        Paragraph("• Submit in the Game Space: app.hypha.earth/en/dho/regen-games/agreements", styles["resource"]),
        Paragraph("• SEEDS Quest Guide: explore.joinseeds.earth", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("Use this space for your journaling or reflection:", styles["body"]),
    ] + journal_lines(14)

    return story


def build_quest_potions(styles):
    cover = cover_block(styles, 1, "Quest 1: Potions",
        "Healing Modalities", 111, 1, "🧪")

    story = cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "Make a healing potion to connect your gut to the ancient wisdom of your bioregion. "
            "Fermented foods, medicinal preparations, and living biology that changes how you "
            "think, feel, and perceive.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "Your gut is not just a digestive organ. It has its own nervous system — around "
            "100 million neurons, more than your spinal cord. Scientists call it the enteric "
            "nervous system, the second brain. Your heart has a similar network: 40,000 neurons "
            "processing information independently before it reaches your head. Three minds. "
            "All of them influenced by what you eat, drink, and ferment. The potion you make "
            "is both medicine and initiation.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Watch the video.", styles["step_num"]),
        Paragraph("The tutorial video walks you through making a potion. Follow along before "
                  "you start experimenting on your own.", styles["step_body"]),
        Paragraph("Step 2: Choose your potions.", styles["step_num"]),
        Paragraph("Select 1-3 healing herbs or ferments to make and showcase. Work with what "
                  "is available in your bioregion.", styles["step_body"]),
        Paragraph("Step 3: Gather your ingredients.", styles["step_num"]),
        Paragraph("Source locally where possible. Farmers markets, foraged (only what you can "
                  "identify with certainty), or your own garden.", styles["step_body"]),
        Paragraph("Step 4: Make your potions.", styles["step_num"]),
        Paragraph("Document the process as you go. Photos, short video clips, notes. What did "
                  "you make? What is the tradition or logic behind this preparation?", styles["step_body"]),
        Paragraph("Step 5: Taste, feel, notice.", styles["step_num"]),
        Paragraph("After taking your potion, sit with it. What do you notice? Any immediate "
                  "effects? How does your gut feel? Continue reflecting over the next days.", styles["step_body"]),
        Paragraph("Step 6: Share your showcase.", styles["step_num"]),
        Paragraph("Create a short video or article showing your potions, how you made them, "
                  "and what you noticed. Post it and add the link to your game space proposal.", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("A 'Showcasing My Potions' video or article, posted publicly and submitted "
                  "in the Game Space.", styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• You do not have to be an expert herbalist. Beginners make the most honest content.", styles["tip"]),
        Paragraph("• The three minds framework (gut, heart, head) is worth reading about before you start.", styles["tip"]),
        Paragraph("• Wild ferments use wild yeast and bacteria from your local environment.", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• Watch Potions Tutorial Video: youtube.com/watch?v=pbhGgg2GZUM", styles["resource"]),
        Paragraph("• HeartMath Institute: heartmath.org", styles["resource"]),
        Paragraph("• The Second Brain by Michael Gershon (book)", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("Observations from making and taking your potions:", styles["body"]),
    ] + journal_lines(14)

    return story


def build_quest_seeds(styles):
    cover = cover_block(styles, 2, "Quest 2: Seeds",
        "Sovereignty & Co-Evolution", 111, 1, "🌱")

    story = cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "Seeds are the oldest technology humans have ever stewarded. Growing plants that "
            "know us, and consciously co-evolving alongside the plants that nourish us. Saving, "
            "documenting, and swapping seeds via your LocalScale profile.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "For most of human history, the selection, saving, trading, and planting of seeds "
            "was a central act of community life. Villages developed distinct seed libraries "
            "over hundreds of generations, adapted to specific climates, soils, and tastes. "
            "That diversity is more than agricultural wealth. It is a cultural memory that "
            "co-evolved with the beings who stewarded it. Seed saving is an act of resistance "
            "and of love.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Gather your seeds.", styles["step_num"]),
        Paragraph("Collect seeds from plants you have grown, received, purchased, or foraged. "
                  "Focus on heirloom and open-pollinated varieties.", styles["step_body"]),
        Paragraph("Step 2: Clean and dry your seeds.", styles["step_num"]),
        Paragraph("Remove pulp or chaff. Dry thoroughly before storing. Seeds with any moisture "
                  "will mold.", styles["step_body"]),
        Paragraph("Step 3: Label and document.", styles["step_num"]),
        Paragraph("For each variety: name, source, year saved, growing zone, growing tips or "
                  "stories about this variety.", styles["step_body"]),
        Paragraph("Step 4: Set up your LocalScale profile.", styles["step_num"]),
        Paragraph("Create or update your profile at localscale.org.", styles["step_body"]),
        Paragraph("Step 5: List your seeds for swap.", styles["step_num"]),
        Paragraph("Add each variety with clear descriptions, photos if you have them, and "
                  "what you would like in return.", styles["step_body"]),
        Paragraph("Step 6: Connect and trade.", styles["step_num"]),
        Paragraph("Reach out to others in your bioregion. Arrange swaps. Meet in person if you can.", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("Active seed listings on your LocalScale profile. Share the link as your quest submission.",
                  styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• Even one or two varieties listed is a valid first submission. The point is to begin.", styles["tip"]),
        Paragraph("• Include growing zone and unusual requirements so swappers know what they are getting.", styles["tip"]),
        Paragraph("• Seed swaps are often social events. Propose a swap gathering if you know other gardeners.", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• LocalScale Platform: localscale.org", styles["resource"]),
        Paragraph("• Seed Savers Exchange: seedsavers.org", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("Document your seed varieties here:", styles["body"]),
    ] + journal_lines(14)

    return story


def build_quest_healing_whole(styles):
    cover = cover_block(styles, 3, "Quest 3: Healing Whole",
        "Loving Earth, Healing Ourselves", 144, 1, "🌿")

    story = cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "Creating spaces of deep healing in the Earth. Digging healing holes, composting, "
            "working with fungi, building the soil microbiome. The soil is not separate from you.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "Healthy living soil contains billions of microorganisms per teaspoon — a greater "
            "diversity of life than almost any other ecosystem on Earth, besides our own healthy "
            "guts. Indigenous cultures understood this. The belief that our health and the health "
            "of our land are the same thing was not mysticism. It was ecology, and now science is "
            "catching up. When we remove ourselves from the cycle of life, we impoverish both "
            "ourselves and the land. This quest asks you to step back in.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Find your space.", styles["step_num"]),
        Paragraph("Identify a patch of ground you have access to and care for. It does not need "
                  "to be large.", styles["step_body"]),
        Paragraph("Step 2: Gather fungi.", styles["step_num"]),
        Paragraph("If you can access old-growth forest, collect a small amount of soil and leaf "
                  "litter from the base of large, healthy trees. This carries local mycorrhizal fungi.", styles["step_body"]),
        Paragraph("Step 3: Collect seeds from old trees.", styles["step_num"]),
        Paragraph("Gather seeds from the oldest, healthiest plants in your local area. Include "
                  "fruiting plants, nitrogen fixers, and as many of the 7 layers of the forest as you can.", styles["step_body"]),
        Paragraph("Step 4: Dig your first healing hole.", styles["step_num"]),
        Paragraph("About 1 ft deep, 3-4 ft wide. This is where your material will go.", styles["step_body"]),
        Paragraph("Step 5: Feed the hole.", styles["step_num"]),
        Paragraph("Add a layer of composted organic matter, a layer of forest floor material "
                  "(to introduce fungi), and your seeds. Cover with soil. Mulch after watering.", styles["step_body"]),
        Paragraph("Step 6: Tend it.", styles["step_num"]),
        Paragraph("Return weekly. Notice what grows. Add more material when you dig the next hole "
                  "nearby. 1 hole per week as your compost fills, each seeded with food plants.", styles["step_body"]),
        Paragraph("Step 7: Document and share.", styles["step_num"]),
        Paragraph("Create a short video or article showing your healing space, what you did, "
                  "and what you are learning.", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("A 'Showcasing My Healing Whole' video or article documenting your practice.",
                  styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• This is a long-term practice. Your submission can document the beginning.", styles["tip"]),
        Paragraph("• If you cannot compost humanure yet, a worm bin or regular compost is a valid start.", styles["tip"]),
        Paragraph("• Building paths through your space makes it more likely you will spend time there.", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• Humanure Handbook by Joseph Jenkins (free online)", styles["resource"]),
        Paragraph("• Fungi Perfecti: fungi.com", styles["resource"]),
        Paragraph("• Wood Wide Web research: search Suzanne Simard forest communication", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("Observations from your healing space:", styles["body"]),
    ] + journal_lines(14)

    return story


def build_quest_food_foresting(styles):
    cover = cover_block(styles, 4, "Food Foresting",
        "Being Human Again", 111, 1, "🍎")

    story = cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "Go out with your friends and family and plant seeds for fruiting plants in public "
            "spaces, parks, forests, and anywhere nature can thrive. Turn our planet into a food "
            "forest where hunger is no longer relevant. This quest is repeatable — every time counts.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "Our forests used to be full of food. Before industrialization, before timber "
            "plantations, the forests of most temperate regions were tended landscapes full of "
            "fruit trees, nut trees, berry bushes, and herbs. Then we cut them down. The Food "
            "Foresting quest is about changing that — one seed at a time, one walk at a time. "
            "If you planted just one seed every ten minutes on a one-hour walk, that is six seeds. "
            "Do that walk once a month for a year and you have planted 72 potential trees. "
            "Every seed is a move.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Get delicious organic fruit.", styles["step_num"]),
        Paragraph("From a farmers market, local farm, or the best option available. Enjoy them "
                  "while you walk. Save the seeds.", styles["step_body"]),
        Paragraph("Step 2: Prepare your seeds.", styles["step_num"]),
        Paragraph("Hold the seeds in your mouth for several minutes before planting. Your saliva "
                  "adds your DNA, your microbiology, and your bioregion's ecosystem to the seed's "
                  "surface. After the Potions quest, this is even more powerful.", styles["step_body"]),
        Paragraph("Step 3: Scout your location.", styles["step_num"]),
        Paragraph("Walk in public parks, forests, or green spaces. Look for places where a fruit "
                  "tree could thrive: forest edges, sunny gaps, stream banks. Somewhere that will "
                  "stay moist, get partial sunlight, and will not get mowed.", styles["step_body"]),
        Paragraph("Step 4: Plant with intention.", styles["step_num"]),
        Paragraph("Send the seeds your intentions. Push each seed into the soil a few centimeters "
                  "deep. Cover it. Water if very dry. Plant multiple seeds per location.", styles["step_body"]),
        Paragraph("Step 5: Mark your spots.", styles["step_num"]),
        Paragraph("Note locations so you can return and see if they sprouted. A photo with GPS "
                  "or a mark on a map.", styles["step_body"]),
        Paragraph("Step 6: Bring friends.", styles["step_num"]),
        Paragraph("Make it a celebration. Bring fruit for everyone to eat together. Make it a ritual.", styles["step_body"]),
        Paragraph("Step 7: Document and share.", styles["step_num"]),
        Paragraph("A short video or article of your adventure. What you planted, where, what it felt like.", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("A video (under 3 minutes) and/or written article about your food foresting adventure. "
                  "This quest can be done again and again — each time earns tokens.",
                  styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• Choose species that will thrive without maintenance once established. Natives are best.", styles["tip"]),
        Paragraph("• Apples, pears, plums, cherries, figs, mulberries, persimmons are great for temperate climates.", styles["tip"]),
        Paragraph("• Make it a celebration. Bring snacks, music, and joy.", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• Agroforestry Research Trust: agroforestry.co.uk", styles["resource"]),
        Paragraph("• Plants For A Future: pfaf.org", styles["resource"]),
        Paragraph("• Submit in the Game Space: app.hypha.earth/en/dho/regen-games/agreements", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("Where did you plant? What species? What did it feel like?", styles["body"]),
    ] + journal_lines(14)

    return story


def build_quest_nvc(styles):
    cover = cover_block(styles, 10, "Quest 10: NVC",
        "Nonviolent Communication", 177, 1, "💬")

    story = cover + section_hr(styles) + [
        Paragraph("What This Quest Is", styles["section_heading"]),
        Paragraph(
            "Learn and practice Nonviolent Communication — the framework that bridges personal "
            "healing into collective co-creation. This is the language of needs, not judgments. "
            "The bridge from individual healing into collective co-creation.",
            styles["body"]),

        Paragraph("Story Card", styles["section_heading"]),
        Paragraph(
            "Marshall Rosenberg spent decades studying what happens when people speak to each other "
            "honestly. Most of what we call communication is not really communication at all. It is "
            "demands, evaluations, comparisons, and punishments dressed up as conversation. NVC "
            "offers a different grammar: observations instead of evaluations, feelings instead of "
            "interpretations, needs instead of demands, requests instead of commands. This matters "
            "enormously for the ReGen Civics game. We are trying to build new organizations, "
            "governance structures, communities. All of them will have conflict. NVC is the "
            "practice that can hold that complexity without collapsing into punishment and blame.",
            styles["story"]),

        Paragraph("How To Do This Quest", styles["section_heading"]),
        Paragraph("Step 1: Take the NVC course.", styles["step_num"]),
        Paragraph("Find the recommended NVC materials and watch the course. Online courses, "
                  "Rosenberg's books, and free recordings of his workshops are all valid.", styles["step_body"]),
        Paragraph("Step 2: Practice the four components.", styles["step_num"]),
        Paragraph("Observation. Feeling. Need. Request. Apply them in your daily conversations. "
                  "Start with low-stakes situations first.", styles["step_body"]),
        Paragraph("Step 3: Find a practice partner.", styles["step_num"]),
        Paragraph("NVC practiced alone is limited. Find someone to study and practice with. "
                  "Many cities have NVC practice circles. Or seek a partner in our forum.", styles["step_body"]),
        Paragraph("Step 4: Apply in a real situation.", styles["step_num"]),
        Paragraph("Bring NVC into a genuine conflict or tension in your life. Not to win. To connect.", styles["step_body"]),
        Paragraph("Step 5: Reflect and share.", styles["step_num"]),
        Paragraph("Write or record a reflection on what you learned. What shifted? Where did it "
                  "get hard? What would you tell someone just starting?", styles["step_body"]),
        Paragraph("Step 6: Attend or host a community session.", styles["step_num"]),
        Paragraph("The forum has regular NVC discussion threads. Participate. If there is not a "
                  "session happening, start one.", styles["step_body"]),

        Paragraph("Deliverable", styles["section_heading"]),
        Paragraph("A written reflection, video, or recorded conversation showing your NVC practice "
                  "and what it opened up.",
                  styles["body"]),

        Paragraph("Tips", styles["section_heading"]),
        Paragraph("• The hardest part: distinguishing observations from evaluations. Practice this first.", styles["tip"]),
        Paragraph("• 'I feel like you don't care about me' is not a feeling. It is an interpretation. "
                  "'I feel hurt and lonely' is a feeling.", styles["tip"]),
        Paragraph("• Gratitude is also NVC. Practice expressing gratitude in terms of what needs were met.", styles["tip"]),

        Paragraph("Resources", styles["section_heading"]),
        Paragraph("• Nonviolent Communication: A Language of Life by Marshall Rosenberg (book)", styles["resource"]),
        Paragraph("• NVC Academy: nvctraining.com", styles["resource"]),
        Paragraph("• Center for Nonviolent Communication: cnvc.org", styles["resource"]),
        Paragraph("• Gabor Mate on trauma and communication: youtube.com/playlist?list=PL3Xi8vZSmBTRlD8Dnx6a16yeBTaSxKNdS", styles["resource"]),

        Paragraph("A Place to Write", styles["section_heading"]),
        Paragraph("Observations, feelings, needs, and requests you are practicing:", styles["body"]),
    ] + journal_lines(14)

    return story


# ─── Main ─────────────────────────────────────────────────────────────────────

QUESTS = [
    ("quest-00-fire.pdf",           build_quest_fire,           "Quest 0: Fire — Field Guide"),
    ("quest-01-potions.pdf",        build_quest_potions,        "Quest 1: Potions — Field Guide"),
    ("quest-02-seeds.pdf",          build_quest_seeds,          "Quest 2: Seeds — Field Guide"),
    ("quest-03-healing-wholes.pdf", build_quest_healing_whole,  "Quest 3: Healing Whole — Field Guide"),
    ("quest-04-food-foresting.pdf", build_quest_food_foresting, "Food Foresting — Field Guide"),
    ("quest-10-nvc.pdf",            build_quest_nvc,            "Quest 10: NVC — Field Guide"),
]

def main():
    styles = build_styles()

    for filename, builder, title in QUESTS:
        out_path = os.path.join(OUT_DIR, filename)
        print(f"Generating {filename} ...")

        story = builder(styles)

        # Cover background colour — use a coloured rectangle via a custom canvas callback
        # We use SimpleDocTemplate without a cover page canvas trick, but add a Spacer placeholder.

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
                # Header band
                canvas.setFillColor(FOREST_DARK)
                canvas.rect(0, letter[1] - 0.55 * inch, letter[0], 0.55 * inch, fill=1, stroke=0)
                canvas.setFillColor(FOREST_LIGHT)
                canvas.setFont("Helvetica-Bold", 8)
                canvas.drawString(0.75 * inch, letter[1] - 0.32 * inch, f"ReGen Civics  |  {t}")
                canvas.setFillColor(colors.white)
                canvas.setFont("Helvetica", 8)
                canvas.drawRightString(letter[0] - 0.75 * inch, letter[1] - 0.32 * inch,
                                       "regencivics.earth")
                # Footer
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
