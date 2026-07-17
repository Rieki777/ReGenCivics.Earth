/**
 * /ship/terms - The ReGen Ship Voyage Covenant and Rental Terms (v1.0).
 * Source of truth for the copy: ReGen_Ship_Voyage_Covenant_and_Rental_Terms.md.
 * Bump SHIP_TERMS_VERSION in shared/shipTerms.ts when the wording changes.
 *
 * The legal entity and the deposit are answered and live in shared/shipTerms.ts
 * (SHIP_LEGAL_ENTITY, SHIP_DEPOSIT_USD) so the page and the booking flow quote
 * the same number. The still-open brackets ([DATE], [YEAR / MAKE / MODEL],
 * [$LATE_FEE], [NUMBER], [core@regencivics.earth], pet policy, mediation) mirror
 * the v1.0 master doc and are Rye's to fill in there; keep the two in sync.
 * §6 (radius), §7 (clean vessel), and §12 (uncovered loss) are the three terms
 * unique to the Ship and are called out on the page.
 */
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { ShipSection, ShipEyebrow, ShipNavRow } from "./shipShared";
import {
  SHIP_TERMS_VERSION,
  SHIP_LEGAL_ENTITY,
  SHIP_DEPOSIT_USD,
  RADIUS_BASE_MILES,
  RADIUS_PER_EXTRA_WEEK_MILES,
  RADIUS_MAX_WEEKS,
  permittedRadiusMiles,
} from "@shared/shipTerms";

/** The §6.2 radius table, computed from the policy so page + map never drift. */
const RADIUS_ROWS = Array.from({ length: RADIUS_MAX_WEEKS }, (_, i) => {
  const weeks = i + 1;
  return { weeks, miles: permittedRadiusMiles(weeks) };
});

export default function ShipTerms() {
  return (
    <PageWrapper>
      <SEO
        title="Voyage Covenant and Rental Terms"
        description="The terms every Crew agrees to before sailing the ReGen Ship: travel radius, clean-vessel rule, and care of the Vessel."
        url="/ship/terms"
      />
      <ShipNavRow current="/ship/terms" />
      <ShipSection>
        <ShipEyebrow>Voyage covenant</ShipEyebrow>
        <h1 className="text-3xl font-bold mb-2">Voyage Covenant and Rental Terms</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Version {SHIP_TERMS_VERSION}. Effective [DATE]. These terms apply to every voyage aboard the ReGen Ship.
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-2xl">
          <h2>1. Who this agreement is between</h2>
          <p>
            This Voyage Covenant and Rental Terms ("Agreement") is between{" "}
            <strong>the {SHIP_LEGAL_ENTITY}, also doing business as ReGen Civics</strong>{" "}
            ("the Church," "we," "us," "our"), owner and steward of the recreational vehicle described below; and{" "}
            <strong>the person who books the voyage and every approved driver and guest aboard</strong> ("you," "the
            Renter," "the Crew").
          </p>
          <p>
            The vehicle is a <strong>[YEAR / MAKE / MODEL] recreational vehicle</strong> with{" "}
            <strong>[solar and battery power systems, water systems, and propane]</strong>, known as the ReGen Ship
            ("the Ship," "the Vessel"). Her home anchorage is <strong>Ashland, Oregon</strong>.
          </p>
          <p>
            By checking the acceptance box at booking and by taking possession of the Ship, you agree to everything in
            this Agreement.
          </p>

          <h2>2. How this fits with the Outdoorsy rental</h2>
          <p>
            The insured rental itself, including payment, the security deposit, and roadside protection, is arranged and
            processed through our listing on <strong>Outdoorsy</strong> ("the Platform"). When you complete the Platform
            booking you also agree to Outdoorsy's rental agreement and its protection or insurance plan. That coverage is
            what protects the Ship on the road.
          </p>
          <p>
            This Agreement sits on top of the Platform booking. It sets the conditions the Church requires as a condition
            of lending the Ship, and it defines what happens when a loss is not covered by the Platform's insurance.
            Where a term here is stricter than a Platform term about how you must care for and use the Ship, the stricter
            term applies. The Platform continues to govern payment, the deposit, and the insurance or protection plan
            itself. If the Platform booking is cancelled or never completed, no voyage is confirmed and you may not take
            the Ship.
          </p>

          <h2>3. Who is allowed to drive and sail</h2>
          <ul>
            <li>
              Every driver must be at least <strong>25 years old</strong>, hold a valid driver's license, and be listed
              and approved as a driver on the Platform booking before they drive.
            </li>
            <li>
              Only approved drivers may operate the Ship. Letting an unapproved or unlicensed person drive is a material
              breach and, in most cases, voids insurance coverage for anything that happens while they are at the wheel.
            </li>
            <li>
              The Crew is capped at <strong>four people aboard, or five when at least three are children</strong>. You
              may not carry more people than the Ship is booked and equipped to sleep and seat with seatbelts.
            </li>
            <li>
              No driver may consume cannabis before or while driving. You confirm that no driver is impaired by alcohol,
              cannabis, or any other substance at any time they operate the Ship.
            </li>
          </ul>

          <h2>4. The voyage: dates and turnovers</h2>
          <ul>
            <li>
              Each voyage boards <strong>Monday at 3:00 pm</strong> and returns the following{" "}
              <strong>Sunday at 11:00 am</strong>, unless your booking confirmation says otherwise.
            </li>
            <li>Voyages run in whole seven-night cycles and may be chained up to <strong>four weeks</strong>.</li>
            <li>The Ship is reset by the Keeper between voyages. Propane, water, and systems are topped up on each turnover.</li>
            <li>
              Late return without written approval is billed at <strong>[$LATE_FEE per hour / per day]</strong> and may
              make you responsible for costs owed to the next Crew whose voyage you delay.
            </li>
          </ul>

          <h2>5. Miles included and overage</h2>
          <ul>
            <li>Each voyage includes <strong>1,000 road miles</strong>.</li>
            <li>Miles driven beyond the included allowance are billed at <strong>$0.50 per mile</strong>.</li>
            <li>
              Odometer readings are taken at departure and return during the pre-sail and return inspections. These road
              miles are separate from the travel radius in Section 6. Road miles measure how far you drive. The radius
              measures how far from Ashland you are allowed to take her.
            </li>
          </ul>

          <h2 id="radius">6. Travel radius: where the Ship may go</h2>
          <p className="rounded-lg border border-[#2f5d3a]/30 bg-[#4a7c59]/10 px-4 py-3 not-prose text-sm">
            This is a core condition of every voyage and one of the main ways we protect the Vessel.
          </p>
          <p>
            <strong>6.1 The base radius.</strong> For a single-week voyage, you may take the Ship anywhere within a{" "}
            <strong>{RADIUS_BASE_MILES}-mile radius of Ashland, Oregon</strong>, measured as a straight-line
            (as-the-crow-flies) distance from the anchorage. On the voyage map this is shown as the{" "}
            <strong>green permitted zone</strong>. The area beyond it is shown as a <strong>red locked ring</strong>.
          </p>
          <p>
            <strong>6.2 Extending the radius with a longer voyage.</strong> Each additional booked week can extend the
            permitted radius. The default policy is:
          </p>
          <table>
            <thead>
              <tr>
                <th>Voyage length</th>
                <th>Permitted radius from Ashland</th>
              </tr>
            </thead>
            <tbody>
              {RADIUS_ROWS.map((r) => (
                <tr key={r.weeks}>
                  <td>{r.weeks} {r.weeks === 1 ? "week" : "weeks"}</td>
                  <td>{r.miles.toLocaleString()} miles</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-muted-foreground">
            Base {RADIUS_BASE_MILES} miles plus {RADIUS_PER_EXTRA_WEEK_MILES} miles per additional week.
          </p>
          <p>
            <strong>6.3 Written permission is always required to go past the base radius.</strong> Extending your booking
            does not by itself unlock the wider zone. Any travel beyond the <strong>{RADIUS_BASE_MILES}-mile base
            radius</strong>, and any travel outside your voyage's permitted radius, requires{" "}
            <strong>explicit written permission from the core team in advance</strong>, naming the specific destination
            and route. We grant this at our discretion and may attach conditions, including a longer minimum booking, a
            larger deposit, or a mileage limit.
          </p>
          <p>
            <strong>6.4 How to request it.</strong> Email <strong>[core@regencivics.earth]</strong> or use the request
            link on the <Link href="/ship/map">voyage map</Link> at least <strong>[72 hours]</strong> before you need to
            cross the line. Tell us where you want to go, why, and for how long. Permission is only valid when we confirm
            it in writing.
          </p>
          <p>
            <strong>6.5 Why this matters.</strong> Taking the Ship outside the permitted radius, or to a destination we
            have not approved, is a material breach of this Agreement. It can also void the Platform's insurance for
            anything that happens outside the covered area. If the Ship is damaged, disabled, stranded, or lost while
            outside the permitted radius or at an unapproved destination, and insurance denies or limits the claim as a
            result, you are personally responsible for the full uncovered loss under Section 12. As one example, taking
            the Ship to a remote desert event without written permission, where she then breaks down and has to be
            recovered, is exactly the situation this section exists to prevent, and the recovery and repair costs would
            fall on you.
          </p>

          <h2 id="clean-vessel">7. Diet, alcohol, and smoking aboard</h2>
          <p className="rounded-lg border border-[#2f5d3a]/30 bg-[#4a7c59]/10 px-4 py-3 not-prose text-sm">
            The Ship is a clean vessel and this is part of what the Crew agrees to when they sail.
          </p>
          <p>
            <strong>7.1 The rule.</strong> For the whole voyage, inside the Ship you agree to:
          </p>
          <ul>
            <li>keep the galley and the Vessel <strong>meat-free</strong>: no meat is prepared, cooked, stored, or eaten inside the Ship;</li>
            <li>keep the Vessel <strong>alcohol-free</strong>: no alcohol is consumed or stored inside the Ship; and</li>
            <li>keep the Vessel <strong>smoke-free and vape-free</strong>: no smoking or vaping of anything, at any time, inside the Ship.</li>
          </ul>
          <p>
            <strong>7.2 Opting out requires written permission.</strong> If you want an exception to any part of this
            rule, you need <strong>explicit written permission from the core team in advance</strong>. Without that
            written permission, the full rule applies for the entire voyage.
          </p>
          <p>
            <strong>7.3 Cannabis.</strong> No one may consume cannabis before or while driving the Ship, and no driver
            may ever operate her while under its influence. Beyond the wheel, we encourage the whole Crew to keep the
            entire voyage cannabis-free. The Ship is a clean vessel and the voyages sail to sacred places in living
            nature, and a clear head is part of what they ask for.
          </p>
          <p>
            <strong>7.4 Why we hold it.</strong> Smoke and odor are very hard to remove from a lived-in vehicle and they
            carry into the next Crew's voyage. Violations that leave the Ship needing deep cleaning, odor remediation,
            upholstery or mattress replacement, or that cause a booking to be cancelled, are billed to you at cost under
            Section 11, plus any lost rental income while the Ship is out of service.
          </p>

          <h2>8. Water doctrine and care of the systems</h2>
          <p>The Ship runs on solar power, stored water, and propane, and she asks for care in return.</p>
          <ul>
            <li>
              Use <strong>only the soaps and cleaning materials provided aboard</strong>. Do not bring or use chemical
              body products, chemical cleaners, or anything not approved for her greywater and tanks.
            </li>
            <li>
              Follow the guidance you receive at orientation for the <strong>solar and battery banks, the water system,
              the propane system, and waste tanks</strong>. Do not modify, bypass, or overload any system.
            </li>
            <li>
              Report any warning light, leak, or system fault to the Keeper or core team as soon as you notice it.
              Continuing to run a system after a fault, when a reasonable person would stop, can make you responsible for
              the resulting damage.
            </li>
          </ul>

          <h2>9. Care of the Ship and prohibited uses</h2>
          <p>You agree to treat the Ship with care and, unless you have our written permission, you will not:</p>
          <ul>
            <li>use the Ship for any commercial purpose, ride-share, delivery, or paid transport;</li>
            <li>sublet, re-rent, lend, or hand the Ship to anyone not approved on the booking;</li>
            <li>take the Ship onto roads, terrain, or water crossings she is not built for, or off maintained roads beyond her clearance and drivetrain;</li>
            <li>exceed her rated occupancy, weight, or towing limits;</li>
            <li>use the Ship to commit any illegal act, carry illegal substances, or transport hazardous materials;</li>
            <li>keep pets aboard except as approved in writing [pet policy: [ALLOWED / NOT ALLOWED / on approval]];</li>
            <li>attach, drill, paint, wrap, or permanently alter the Ship or her fittings; or</li>
            <li>remove, disable, or tamper with the GPS tracker, safety equipment, or any monitoring system (see Section 15).</li>
          </ul>

          <h2>10. Orientation, pre-sail, and return</h2>
          <ul>
            <li>
              <strong>Orientation gate.</strong> Before your first drive, an approved Keeper walks you through the Ship in
              a roughly two-hour orientation. Your voyage is not cleared to depart until that orientation is complete.
            </li>
            <li>
              <strong>Pre-sail inspection.</strong> At handover we record the Ship's condition, fuel, odometer, and system
              levels together. Photos are part of the record.
            </li>
            <li>
              <strong>Return condition.</strong> Bring the Ship back on time, at the agreed fuel level, with tanks and
              waste handled as shown at orientation, and clean and tidy inside. Return cleaning beyond normal use, missing
              or damaged items, and unhandled waste tanks are billed under Section 11.
            </li>
          </ul>

          <h2>11. Payment, deposit, and charges for loss or damage</h2>
          <ul>
            <li>
              Rental payment and the refundable <strong>security deposit</strong> are handled on the Platform. The current
              deposit is <strong>${SHIP_DEPOSIT_USD.toLocaleString()}</strong>, refundable after the return inspection,
              less any charges you are responsible for under this Agreement.
            </li>
            <li>
              The voyage page may also invite a separate <strong>offering or donation</strong> to the Church. That
              offering is voluntary and is not the rental payment.
            </li>
            <li>
              You authorize the Church and the Platform to charge you, through the deposit and beyond it if the deposit is
              not enough, for: mileage overage; late return; fuel and tank shortfalls; cleaning, odor, and smoke
              remediation; loss of or damage to the Ship, her systems, and her contents; recovery and towing; and any
              lost rental income while the Ship is out of service because of something you are responsible for.
            </li>
            <li>
              Charges for physical damage are net of any insurance or Platform protection actually paid. What insurance
              does not cover is governed by Section 12.
            </li>
          </ul>

          <h2 id="uncovered-loss">12. Liability, insurance, and your responsibility for uncovered loss</h2>
          <p className="rounded-lg border border-[#b5762f]/40 bg-[#b5762f]/10 px-4 py-3 not-prose text-sm">
            This section is how the Church protects its asset. Read it closely.
          </p>
          <p>
            <strong>12.1 You are responsible for the Ship while she is in your care.</strong> From handover until the Ship
            is back at the anchorage and inspected, you are responsible for her condition and for what happens to her,
            except for ordinary wear and for faults that are our fault.
          </p>
          <p>
            <strong>12.2 Insurance is the first layer.</strong> The Platform's protection or insurance plan is the first
            source of recovery for covered physical damage and covered liability. You agree to cooperate fully and
            promptly with any claim, including giving statements, photos, and a police or incident report where one
            applies.
          </p>
          <p>
            <strong>12.3 You are personally liable for what insurance does not cover.</strong> To the fullest extent
            allowed by Oregon law, you are personally responsible for any loss, damage, cost, or liability arising from
            your voyage that the Platform's insurance or protection plan does not pay, denies, or does not fully cover,
            including but not limited to:
          </p>
          <ul>
            <li>the cost to repair or replace the Ship and her systems and contents;</li>
            <li>diminished value of the Ship after damage;</li>
            <li>towing, recovery, storage, and transport, including recovery from a remote or unapproved location;</li>
            <li>lost rental income for the period the Ship is out of service;</li>
            <li>insurance deductibles and any gap between the claim paid and the true cost; and</li>
            <li>the Church's costs of enforcing this Agreement, including reasonable attorney fees and collection costs.</li>
          </ul>
          <p>
            <strong>12.4 Breach that causes or worsens a loss.</strong> If a loss is caused by, or made worse by, or is
            denied by insurance because of, your breach of this Agreement, including taking the Ship outside the permitted
            radius under Section 6, driving impaired, allowing an unapproved driver, a prohibited use under Section 9, or
            a diet, smoking, or systems violation, then you are personally liable for the entire uncovered amount of that
            loss. The Church may seek that amount from you directly.
          </p>
          <p>
            <strong>12.5 Indemnification.</strong> You agree to indemnify and hold harmless the Church, its ministers,
            officers, volunteers, Keepers, and the winter host, from any claim, damage, fine, or cost brought by anyone
            arising from your use of the Ship, except to the extent it is caused by our own gross negligence or willful
            misconduct.
          </p>
          <p>
            <strong>12.6 Our liability to you.</strong> The Church's total liability to you connected with the rental is
            limited to the amount you paid to rent the Ship. We are not liable for your indirect or consequential losses,
            such as travel costs, missed plans, or lost time, if the voyage is delayed, cut short, or cancelled for
            reasons including a mechanical fault, weather, or recall of the Vessel.
          </p>

          <h2>13. Breakdowns, roadside, and recovery</h2>
          <ul>
            <li>
              If the Ship breaks down or is in an accident, first make sure everyone is safe, then contact{" "}
              <strong>[roadside / Platform assistance: [NUMBER]]</strong> and the core team.
            </li>
            <li>
              Do not attempt major repairs or authorize a shop yourself without our approval, except where it is needed
              for immediate safety.
            </li>
            <li>
              If the Ship needs recovery because of a covered mechanical fault that is not your doing and she was within
              the permitted radius, we handle it. If recovery is needed because of your breach or from an unapproved
              location, the recovery cost is yours under Section 12.
            </li>
          </ul>

          <h2>14. Changes, cancellation, and recall</h2>
          <ul>
            <li>Cancellations and changes follow the Platform's cancellation policy plus any terms in your booking confirmation.</li>
            <li>An approved booking that does not complete the Platform step within <strong>72 hours</strong> may expire and release the week.</li>
            <li>
              The Church may <strong>recall the Ship</strong> or end a voyage early if you materially breach this
              Agreement, if the Ship is being used unsafely or outside the permitted radius, or if continuing would put
              the Vessel or people at risk. Where safe and reasonable we will contact you first.
            </li>
          </ul>

          <h2>15. Location tracking and privacy</h2>
          <p>
            The Ship carries a <strong>GPS tracker</strong> for safety, recovery, and to confirm she stays within the
            permitted radius. By taking the Ship you consent to us collecting her location while she is in your care. We
            use that data to run and protect the rental and we do not sell it. You agree not to disable, remove, or
            interfere with the tracker.
          </p>

          <h2>16. Assumption of risk and release</h2>
          <p>
            Voyages travel through wild and remote country, off-grid conditions, and sacred places in living nature. You
            understand that travel of this kind carries inherent risks, including to the Crew's health and safety, and you
            accept those risks for yourself and your Crew. To the fullest extent allowed by Oregon law, you release the
            Church from liability for injury, loss, or harm that arises from those inherent risks and not from our own
            gross negligence or willful misconduct.
          </p>

          <h2>17. Default and remedies</h2>
          <p>
            If you breach this Agreement, the Church may, in addition to the charges above: end the voyage and recall the
            Ship; keep and apply the deposit; pursue you for uncovered losses under Section 12; and recover its costs of
            enforcement, including reasonable attorney fees. These remedies add together and do not replace one another.
          </p>

          <h2>18. Governing law and disputes</h2>
          <p>
            This Agreement is governed by the laws of the <strong>State of Oregon</strong>. The parties agree that any
            dispute will be brought in the state or federal courts located in <strong>Jackson County, Oregon</strong>,
            and the parties consent to that venue. [Optional: the parties will first attempt to resolve any dispute
            through good-faith mediation in Jackson County before filing suit.]
          </p>

          <h2>19. General terms</h2>
          <ul>
            <li><strong>Entire agreement.</strong> This Agreement, together with your Platform booking and its rental agreement, is the entire agreement about the rental of the Ship.</li>
            <li><strong>Order of precedence.</strong> For care and use of the Ship, this Agreement controls where it is stricter. For payment, the deposit, and insurance, the Platform agreement controls.</li>
            <li><strong>Severability.</strong> If any part is found unenforceable, the rest stays in force.</li>
            <li><strong>Amendment and versions.</strong> We may update these terms. The version in effect for your voyage is the one shown and accepted at the time you booked. Each acceptance records the version and the date and time.</li>
            <li><strong>No waiver.</strong> If we do not enforce a term once, we do not give up the right to enforce it later.</li>
          </ul>

          <h2>20. Acceptance</h2>
          <p>
            By checking the acceptance box at booking, you confirm that you have read, understood, and agree to this
            Voyage Covenant and Rental Terms, including the travel radius in Section 6, the diet and clean-living rule in
            Section 7, and your responsibility for uncovered loss in Section 12. Your electronic acceptance, with the
            version number and the date and time, has the same effect as a signature.
          </p>
          <p className="text-sm text-muted-foreground">Accepted version: {SHIP_TERMS_VERSION}. Accepted on: recorded automatically at booking.</p>

          <hr />

          <h2>Plain-language summary shown at checkout</h2>
          <p>You can read the full terms above. Here is the short version of what you are agreeing to:</p>
          <ul>
            <li>I will keep the Ship within <strong>{RADIUS_BASE_MILES} miles of Ashland</strong> on a one-week voyage. Going farther needs written permission from the core team ahead of time, and longer voyages can unlock a wider range.</li>
            <li>Inside the Ship I will keep it <strong>meat-free, alcohol-free, and smoke-free</strong> for the whole voyage, unless the core team gives me written permission otherwise.</li>
            <li>I will <strong>never drive after cannabis</strong> and I understand the Crew is encouraged to keep the whole voyage cannabis-free.</li>
            <li>I will care for her systems, use only the <strong>approved soaps and cleaning materials</strong>, and follow the water doctrine.</li>
            <li>I understand that if I break these terms and the Ship is damaged or lost, I am <strong>personally responsible for what insurance does not cover</strong>, and the Church can seek that from me.</li>
          </ul>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Ready to sail? <Link href="/ship/book" className="underline text-[#2f5d3a] dark:text-[#7dd87d] font-medium">Request a voyage week</Link>.
        </p>
      </ShipSection>
    </PageWrapper>
  );
}
