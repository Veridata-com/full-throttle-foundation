import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";

const Terms = () => (
  <>
    <SEO title="Terms of Service" description="The terms governing your use of AdRise." />
    <div className="container max-w-3xl py-12">
      <Link to="/" className="text-sm text-primary hover:underline">← Back home</Link>
      <h1 className="font-display text-4xl font-bold mt-4 mb-2">Terms of Service</h1>
      <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString()}</p>

      <h2 className="font-display text-2xl font-bold mt-8">1. Acceptance</h2>
      <p>By creating an account or using AdRise, you agree to these terms. If you don't agree, don't use the service.</p>

      <h2 className="font-display text-2xl font-bold mt-6">2. Your account</h2>
      <p>You're responsible for keeping your credentials secure and for all activity under your account. You must be at least 18 to use AdRise.</p>

      <h2 className="font-display text-2xl font-bold mt-6">3. Acceptable use</h2>
      <p>You may not upload illegal content, infringe others' IP, generate misleading or deceptive ads, or attempt to abuse, reverse-engineer, or overwhelm the service.</p>

      <h2 className="font-display text-2xl font-bold mt-6">4. Your content</h2>
      <p>You own everything you upload and everything we generate for you. You grant us a limited license to process your content solely to operate the service.</p>

      <h2 className="font-display text-2xl font-bold mt-6">5. Subscriptions & refunds</h2>
      <p>Paid plans renew monthly. You can cancel anytime via the Billing page; cancellation takes effect at the end of the current period. Refunds are at our discretion within 14 days of purchase.</p>

      <h2 className="font-display text-2xl font-bold mt-6">6. AI output</h2>
      <p>AI-generated copy and tags are provided as-is. You're responsible for reviewing all output before publishing.</p>

      <h2 className="font-display text-2xl font-bold mt-6">7. Termination</h2>
      <p>We may suspend or terminate accounts that violate these terms.</p>

      <h2 className="font-display text-2xl font-bold mt-6">8. Liability</h2>
      <p>The service is provided "as is" without warranties. To the fullest extent permitted by law, our liability is limited to the amount you paid us in the prior 12 months.</p>

      <h2 className="font-display text-2xl font-bold mt-6">9. Contact</h2>
      <p>Questions? Email hello@adrise.app.</p>
    </div>
  </>
);

export default Terms;
