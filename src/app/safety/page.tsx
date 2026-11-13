import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = {
  title: "Safety tips",
  description: "How to sublease safely: spotting scams, paying safely, and checking the lease.",
};

export default function SafetyPage() {
  return (
    <ProsePage
      title="Sublease safely"
      intro="Every account on subBruinLease is tied to a verified UCLA email, but that doesn’t make every deal safe. A few habits go a long way."
    >
      <h2>Red flags</h2>
      <ul>
        <li>They won’t show the place in person or on a live video call.</li>
        <li>They ask for a deposit or rent before you’ve seen the place or signed anything.</li>
        <li>They want payment by wire transfer, gift cards, crypto, or apps with no buyer protection.</li>
        <li>The rent is far below everything else nearby, or there’s pressure to decide right now.</li>
        <li>They want to move the conversation off UCLA email quickly, or the story keeps changing.</li>
      </ul>

      <h2>Before you pay</h2>
      <ul>
        <li>
          <strong>See it.</strong> Visit in person, or get a live video tour where they open doors and show the street.
        </li>
        <li>
          <strong>Check the lease.</strong> Ask to see the original lease and confirm the landlord allows subleasing.
          Many leases require written approval.
        </li>
        <li>
          <strong>Get it in writing.</strong> A short sublease agreement should list the dates, rent, deposit, utilities,
          and what happens to the deposit at move-out.
        </li>
        <li>
          <strong>Pay traceably.</strong> Use a method with a record (and ideally buyer protection). Get a receipt for
          deposits.
        </li>
        <li>
          <strong>Meet the roommates</strong> if you’ll be living with anyone.
        </li>
      </ul>

      <h2>If you’re posting your place</h2>
      <ul>
        <li>Confirm your lease allows subleasing and get your landlord’s OK first.</li>
        <li>Don’t post your exact address or unit number. Share it once you’ve talked to someone.</li>
        <li>Photos are stripped of location data when you upload them, but double-check they don’t show mail or documents.</li>
        <li>Meet in person before handing over keys.</li>
      </ul>

      <h2>Something seems off?</h2>
      <p>
        Use the <strong>Report this listing</strong> button on the listing. The poster won’t know who reported it, and
        our moderators can take it down. If you’ve lost money, contact your bank right away and file a report with{" "}
        <a href="https://reportfraud.ftc.gov" target="_blank" rel="noreferrer">
          the FTC
        </a>{" "}
        and{" "}
        <a href="https://police.ucla.edu" target="_blank" rel="noreferrer">
          UCPD
        </a>
        .
      </p>
      <p>
        UCLA’s{" "}
        <a href="https://housing.ucla.edu" target="_blank" rel="noreferrer">
          housing resources
        </a>{" "}
        can also help with questions about your rights as a tenant. <Link href="/">Back to Explore</Link>
      </p>
    </ProsePage>
  );
}
