import type { Metadata } from "next";
import { ContactLine, ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Privacy"
      intro="We collect as little as we can, and we never sell your information."
      updated="November 13, 2026"
    >
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your UCLA email, the display name you choose, and optionally a graduation year,
          bio, and photo.
        </li>
        <li>
          <strong>What you post:</strong> listings, photos, saved listings, messages you send to posters, and reports.
        </li>
        <li>
          <strong>A sign-in cookie</strong> that keeps you logged in. We don’t use advertising or tracking cookies.
        </li>
      </ul>

      <h2>Who sees what</h2>
      <ul>
        <li>Anyone can see published listings, including your display name and profile photo on them.</li>
        <li>
          Your email is never shown on listings. When you message a poster, we email your message to them and they reply
          to your email directly, so they’ll see your address then. The poster’s email stays hidden from you until they
          reply.
        </li>
        <li>Saved listings and reports are private. Posters never learn who reported them.</li>
        <li>Moderators can see reports and account details when reviewing them.</li>
      </ul>

      <h2>Photos</h2>
      <p>
        Uploaded photos are re-encoded, which removes hidden data such as GPS location. Only post an approximate
        location, never your exact address or unit.
      </p>

      <h2>Services we use</h2>
      <p>
        We store data with our database and hosting providers and send email through an email delivery service. They
        process data only to run subBruinLease.
      </p>

      <h2>Your choices</h2>
      <p>
        You can edit your profile, close your listings, and remove saved listings at any time. To delete your account
        and its data, <ContactLine />.
      </p>
    </ProsePage>
  );
}
