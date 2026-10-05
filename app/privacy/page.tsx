import type { Metadata } from "next";
import { format, parseISO } from "date-fns";
import { LegalToc, type TocSection } from "@/components/LegalToc";
import { LEGAL } from "@/lib/legal";

// The site's privacy policy, with the text-message and phone-call terms.
//
// Everything on this page is a statement about what the site actually does.
// When the code changes what is collected, where it goes, or how people are
// contacted, this page has to change with it, and LEGAL.effectiveDate moves.
// In particular, three passages track things outside this file:
//  - "What we collect" mirrors lib/geo.ts, lib/traffic-source.ts,
//    components/ViewTracker.tsx and the signup action.
//  - "Advertising and Meta" says Meta receives a scrambled name, email AND
//    phone number. That is true because Savion keeps "Automatic advanced
//    matching" on in his pixel with the phone field included (his decision,
//    2026-10-05). It is also why the text-message section does NOT carry the
//    stock line "mobile numbers are never shared with third parties for
//    marketing": with the pixel doing that, the line would be false.
//  - "Phone calls" describes calls to people who agreed to them. The signup
//    form does not ask for that agreement today (also his decision), so as
//    things stand nobody has given it.

export const metadata: Metadata = {
  title: "Privacy Policy · 100 Day AI Challenge",
  description:
    "What this site collects, who receives it, and the terms for text messages and phone calls, including calls made by an AI voice assistant.",
};

const SECTIONS: TocSection[] = [
  { id: "collect", title: "What we collect" },
  { id: "use", title: "How we use it" },
  { id: "share", title: "Who receives it" },
  { id: "ads", title: "Advertising and Meta" },
  { id: "texts", title: "Text messages" },
  { id: "calls", title: "Phone calls and AI voice" },
  { id: "storage", title: "Cookies and browser storage" },
  { id: "keeping", title: "Keeping and protecting it" },
  { id: "choices", title: "Your choices and rights" },
  { id: "members", title: "Pages made by members" },
  { id: "children", title: "Children" },
  { id: "changes", title: "Changes to this page" },
  { id: "contact", title: "Contact" },
];

const us = `${LEGAL.operator}, doing business as ${LEGAL.tradingAs}`;

export default function PrivacyPage() {
  return (
    <div>
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Including the terms for text messages and phone calls. Last updated{" "}
          {format(parseISO(LEGAL.effectiveDate), "MMMM d, yyyy")}.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          This is the privacy policy for {LEGAL.siteHost} (the “site”), which is
          run by {us} (“we”, “us”). It says what the site collects, why, who
          else receives it, and what you can do about it. It also sets out the
          terms that apply if you agree to be texted or called, including calls
          made by an AI voice assistant.
        </p>
      </header>

      {/* Two columns from lg up: the list of sections stays put on the left
          while the text scrolls. On smaller screens the list becomes a strip
          pinned to the top of the screen instead. */}
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <aside className="sticky top-0 z-10 -mx-4 mb-6 border-b border-zinc-200 bg-zinc-50/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:top-8 lg:z-auto lg:mx-0 lg:mb-0 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none dark:border-zinc-800 dark:bg-zinc-950/95 dark:lg:bg-transparent">
          <LegalToc sections={SECTIONS} />
        </aside>

        <article className="min-w-0 max-w-2xl space-y-10 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <Section id="collect" title="What we collect">
            <p>
              <B>When you look at a public page.</B> No name is attached to any
              of this.
            </p>
            <ul className={LIST}>
              <li>Which apps appeared on your screen, and which you opened.</li>
              <li>
                A random ID kept in your browser, so that coming back counts as
                one visitor and not two.
              </li>
              <li>
                Roughly where you are: country, state or region, city, and a
                position rounded to about 7 miles (11 km). Our hosting provider
                works this out from your IP address. We store the estimate, not
                the IP address.
              </li>
              <li>
                Where you came from: the website that linked to us, and any
                campaign tags on the link you followed.
              </li>
              <li>The kind of browser you use, when you open an app.</li>
            </ul>

            <p>
              <B>When you ask to be notified about an app.</B>
            </p>
            <ul className={LIST}>
              <li>
                Your first name, your email address, and your mobile number if
                you give one.
              </li>
              <li>
                Whether you agreed to be texted, the exact wording you agreed
                to, and when.
              </li>
              <li>
                Which app you asked about, plus the rough location, source and
                browser details described above.
              </li>
            </ul>

            <p>
              <B>When you create an account</B> to run your own challenge.
            </p>
            <ul className={LIST}>
              <li>
                Your name, email address and profile picture, from your Google
                account.
              </li>
              <li>What you add: your entries, notes, links and screenshots.</li>
            </ul>

            <p>
              We do not collect payment details, your precise location, or
              anything from your device beyond what is listed here.
            </p>
          </Section>

          <Section id="use" title="How we use it">
            <ul className={LIST}>
              <li>
                To tell you about the app you asked about: by email, and by text
                or phone if you agreed to that.
              </li>
              <li>
                To see which apps people are interested in, so we know which
                ones to keep building.
              </li>
              <li>
                To see where visitors come from and which links and ads bring
                them.
              </li>
              <li>
                To show our ads to people who have visited or signed up, as
                described under <A href="#ads">Advertising and Meta</A>.
              </li>
              <li>
                To run the site, keep it secure, fix problems, and filter out
                automated traffic.
              </li>
              <li>To meet legal obligations.</li>
            </ul>
          </Section>

          <Section id="share" title="Who receives it">
            <ul className={LIST}>
              <li>
                <B>Companies that run the site for us.</B> Vercel hosts it.
                Supabase stores the data and handles sign-in. Google handles
                sign-in for members. They process information on our
                instructions.
              </li>
              <li>
                <B>HighLevel (LeadConnector).</B> This is our contact and
                messaging system. When you sign up for an app, your name, email,
                phone number and the app’s name are saved there, and any texts
                or calls to you go out through it.
              </li>
              <li>
                <B>Meta (Facebook and Instagram),</B> for advertising. See the
                next section.
              </li>
              <li>
                <B>The member whose page you signed up on.</B> See{" "}
                <A href="#members">Pages made by members</A>.
              </li>
              <li>
                <B>Authorities,</B> when the law requires it, and a successor if
                this business is ever sold or merged.
              </li>
            </ul>
            <p>We do not sell your information for money.</p>
          </Section>

          <Section id="ads" title="Advertising and Meta">
            <p>
              Some pages on the site load Meta’s advertising tool, the Meta
              Pixel. On those pages:
            </p>
            <ul className={LIST}>
              <li>
                Meta learns that your browser visited the page, and when you
                sign up for an app, along with that app’s name.
              </li>
              <li>
                Meta’s tool also takes a scrambled (“hashed”) copy of the first
                name, email address and phone number typed into the signup form.
                Meta uses it to match you to a Facebook or Instagram account.
              </li>
              <li>
                That lets us measure whether our ads work and show our ads to
                people who have visited or signed up. Meta also uses what it
                receives under its own{" "}
                <A href="https://www.facebook.com/privacy/policy/" external>
                  privacy policy
                </A>
                .
              </li>
            </ul>
            <p>
              <B>If you do not want this:</B>
            </p>
            <ul className={LIST}>
              <li>
                Turn on Global Privacy Control in your browser. When your
                browser sends that signal, we do not load Meta’s tool for you at
                all.
              </li>
              <li>
                Change what Meta does with it in your Facebook or Instagram ad
                settings.
              </li>
              <li>
                Email us and we will leave you out of our advertising audiences.
              </li>
            </ul>
            <p>
              Some US state laws call this “sharing” personal information for
              targeted advertising and give you the right to opt out. The three
              options above are how to do that.
            </p>
          </Section>

          <Section id="texts" title="Text messages">
            <p>
              <B>What you are agreeing to.</B> If you type a mobile number into
              a “Notify me” form and tick the box agreeing to texts, you agree
              to receive text messages from {LEGAL.tradingAs} about the app you
              signed up for: when it launches, updates to it, and occasional
              follow-ups about it.
            </p>
            <ul className={LIST}>
              <li>
                Agreeing to texts is optional. It is not a condition of buying
                or using anything.
              </li>
              <li>Message frequency varies.</li>
              <li>Message and data rates may apply.</li>
              <li>
                Reply <B>STOP</B> to any message to stop them. Reply <B>HELP</B>{" "}
                for help, or email{" "}
                <A href={`mailto:${LEGAL.contactEmail}`}>
                  {LEGAL.contactEmail}
                </A>
                .
              </li>
              <li>
                Mobile carriers are not liable for delayed or undelivered
                messages.
              </li>
            </ul>
            <p>
              <B>Your number and your agreement.</B> We do not sell your mobile
              number. We do not pass your agreement to receive texts to anyone
              else so that they can text you. Texts are sent through our
              messaging provider and the mobile carriers, who handle your number
              only to deliver them.
            </p>
            <p>
              The one other use of a number you type into the form is the
              advertising use described under{" "}
              <A href="#ads">Advertising and Meta</A>: on pages that use Meta’s
              tool, Meta receives a scrambled copy of it. That section says how
              to opt out.
            </p>
          </Section>

          <Section id="calls" title="Phone calls and AI voice">
            <p>
              <B>What you are agreeing to.</B> If you have agreed to be called,
              we may call the number you gave us about the app or apps you
              signed up for. Agreeing to texts is not agreeing to calls; we only
              call people who have agreed to calls.
            </p>
            <ul className={LIST}>
              <li>
                <B>Calls may be made by an AI voice assistant.</B> That is a
                computer-generated voice, not a live person, and the call may be
                placed by automated dialing technology. The assistant says that
                it is an AI at the start of the call.
              </li>
              <li>
                Calls may be recorded and turned into written notes so we have a
                record of what was said. You are told at the start of a call if
                it is being recorded.
              </li>
              <li>
                Calls are placed between 8 a.m. and 9 p.m. in your local time.
              </li>
              <li>
                Agreeing to calls is optional. It is not a condition of buying
                or using anything.
              </li>
              <li>Your phone company’s usual charges may apply.</li>
            </ul>
            <p>
              <B>To stop the calls,</B> say so on any call, to the assistant or
              to a person, or email{" "}
              <A href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</A>.
              We stop within 10 business days, and usually much sooner. Stopping
              calls does not stop texts, and replying STOP to a text does not
              stop calls, so tell us about each one you want stopped.
            </p>
          </Section>

          <Section id="storage" title="Cookies and browser storage">
            <ul className={LIST}>
              <li>
                <B>A visitor ID</B> in your browser’s local storage: the random
                ID mentioned above. It stays until you clear your browser’s data
                for this site.
              </li>
              <li>
                <B>A note of where your visit came from,</B> and a marker that
                stops a one-time animation from replaying, both kept for as long
                as the tab stays open.
              </li>
              <li>
                <B>Sign-in cookies,</B> only if you have an account and are
                signed in.
              </li>
              <li>
                <B>Meta’s cookies,</B> on pages that load Meta’s tool.
              </li>
            </ul>
            <p>
              You can clear all of these in your browser’s settings. The site
              works without them, except that signing in needs its cookies.
            </p>
          </Section>

          <Section id="keeping" title="Keeping and protecting it">
            <p>
              We keep what you gave us when signing up for an app until you ask
              us to delete it, or until we no longer need that app’s list. We do
              not delete it on a fixed schedule today. The browsing records,
              which carry no name, are kept so we can compare interest in the
              apps over time.
            </p>
            <p>
              The information is stored with our database provider, and only we
              and the member whose page it came from can read it. No system is
              perfectly secure, so we cannot promise that nothing will ever go
              wrong. The site is run from the United States, and your
              information is processed there.
            </p>
          </Section>

          <Section id="choices" title="Your choices and rights">
            <ul className={LIST}>
              <li>
                <B>See, correct or delete</B> what we hold about you: email us.
              </li>
              <li>
                <B>Stop texts:</B> reply STOP. <B>Stop calls:</B> say so on a
                call or email us. <B>Stop emails:</B> reply to one and say so,
                or email us.
              </li>
              <li>
                <B>Opt out of advertising:</B> see{" "}
                <A href="#ads">Advertising and Meta</A>.
              </li>
              <li>
                <B>Browse without being counted as a returning visitor:</B>{" "}
                clear the site’s data in your browser, or use a private window.
              </li>
            </ul>
            <p>
              Depending on where you live, the law may give you these and other
              rights, including the right not to be treated differently for
              using them. We aim to answer every request within 30 days. Write
              to{" "}
              <A href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</A>.
            </p>
          </Section>

          <Section id="members" title="Pages made by members">
            <p>
              Anyone can create an account and publish a page of their own
              projects on this site. When you sign up for an app on a member’s
              page, that member receives your details and decides how to contact
              you, within what you agreed to. They may connect their own contact
              system and their own Meta advertising tool to their page. This
              policy describes what the site itself does; a member may have a
              policy of their own for what they do next.
            </p>
          </Section>

          <Section id="children" title="Children">
            <p>
              The site is not directed to children under 13, and we do not
              knowingly collect information from them. The signup forms are for
              adults. If you believe a child has given us information, email us
              and we will delete it.
            </p>
          </Section>

          <Section id="changes" title="Changes to this page">
            <p>
              When what we do changes, this page changes with it and the date at
              the top moves. If a change affects how we contact people who have
              already signed up, we will tell them before it takes effect.
            </p>
          </Section>

          <Section id="contact" title="Contact">
            <p>
              {LEGAL.operator}
              <br />
              doing business as {LEGAL.tradingAs}
              <br />
              <A href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</A>
            </p>
          </Section>
        </article>
      </div>
    </div>
  );
}

const LIST = "list-disc space-y-1.5 pl-5";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    // scroll-mt: a link to a section must not land it under the pinned
    // strip on small screens.
    <section id={id} className="scroll-mt-16 space-y-3 lg:scroll-mt-8">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      {children}
    </section>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return (
    <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
      {children}
    </strong>
  );
}

function A({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:decoration-indigo-600 dark:text-indigo-300 dark:decoration-indigo-700"
    >
      {children}
    </a>
  );
}
