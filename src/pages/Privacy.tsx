import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";

const Privacy = () => (
  <>
    <SEO title="Privacy Policy" description="How AdRise collects, uses, and protects your data." />
    <div className="container max-w-3xl py-12 prose prose-sm prose-neutral">
      <Link to="/" className="text-sm text-primary hover:underline">← Back home</Link>
      <h1 className="font-display text-4xl font-bold mt-4 mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString()}</p>

      <h2 className="font-display text-2xl font-bold mt-8">1. What we collect</h2>
      <p>We collect the email address you use to sign up, the product images you upload, the slideshows you generate, and basic usage analytics (page views, feature usage). Payment information is handled by Stripe — we never see or store your card details.</p>

      <h2 className="font-display text-2xl font-bold mt-6">2. How we use it</h2>
      <p>Your images are processed by an AI model (Google Gemini via Lovable AI Gateway) to generate tags and ad copy. They are stored privately in your account and are not used to train any AI model. We use your email to send essential service notifications.</p>

      <h2 className="font-display text-2xl font-bold mt-6">3. Sharing</h2>
      <p>We do not sell your data. We share data only with sub-processors required to run the service: Supabase (hosting & database), Stripe (payments), and the Lovable AI Gateway (AI processing).</p>

      <h2 className="font-display text-2xl font-bold mt-6">4. Your rights</h2>
      <p>You can export or delete your data at any time from the Account page, or by emailing us. Account deletion permanently removes your images, slideshows, and profile within 30 days.</p>

      <h2 className="font-display text-2xl font-bold mt-6">5. Contact</h2>
      <p>Questions? Email privacy@adrise.app.</p>
    </div>
  </>
);

export default Privacy;
