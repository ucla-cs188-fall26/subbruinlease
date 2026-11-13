import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <ProsePage
      title="Terms of use"
      intro="The short version: be honest, be kind, and only post places you’re allowed to sublease."
      updated="November 13, 2026"
    >
      <h2>Who can use subBruinLease</h2>
      <p>
        You need a UCLA email address (@ucla.edu or @g.ucla.edu) to sign in, post, save, or message. One account per
        person. subBruinLease is a student project and isn’t affiliated with or endorsed by UCLA.
      </p>

      <h2>What we do (and don’t do)</h2>
      <p>
        We help students find each other. We aren’t a party to any sublease, we don’t handle payments, and we don’t
        inspect or guarantee any listing. Any agreement is between you and the other student, and you’re responsible
        for checking the details. Read our <Link href="/safety">safety tips</Link> before paying anyone.
      </p>

      <h2>Posting a listing</h2>
      <ul>
        <li>Only post a place you have the right to sublease, and follow your lease and your landlord’s rules.</li>
        <li>Keep it accurate: real photos of the actual place, real prices, real dates.</li>
        <li>Close or pause your listing once it’s taken.</li>
        <li>No discriminatory listings. Fair housing laws apply to you.</li>
      </ul>

      <h2>Not allowed</h2>
      <ul>
        <li>Scams, fake listings, or asking for money for a place you can’t provide.</li>
        <li>Harassment, hateful content, or spam, including in messages.</li>
        <li>Using someone else’s account or email, or collecting other students’ information.</li>
        <li>Trying to break, overload, or scrape the site.</li>
      </ul>

      <h2>Moderation</h2>
      <p>
        We can hide listings or suspend accounts that break these rules, at our discretion and without notice. If you
        think we got it wrong, <ContactLine />.
      </p>

      <h2>Your content</h2>
      <p>
        You own what you post. By posting, you let us display it on subBruinLease so others can find your place. You can
        close your listing any time.
      </p>

      <h2>No warranty</h2>
      <p>
        subBruinLease is provided “as is”. To the extent the law allows, we aren’t liable for losses from using the site
        or from dealings between students.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. If the changes matter, we’ll note it on the site.</p>
    </ProsePage>
  );
}
