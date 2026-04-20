import { Helmet } from "react-helmet-async";

interface Props {
  title: string;
  description?: string;
  canonical?: string;
}

export function SEO({ title, description, canonical }: Props) {
  const fullTitle = title.includes("AdRise") ? title : `${title} · AdRise`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description.slice(0, 158)} />}
      {canonical && <link rel="canonical" href={canonical} />}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description.slice(0, 158)} />}
      <meta property="og:type" content="website" />
    </Helmet>
  );
}
