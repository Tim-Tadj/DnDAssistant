// A monster image served as JPEG XL with a WebP fallback (via <picture>,
// so each browser downloads only the first format it can decode). If the
// built copy fails it retries the original URL, then shows `fallback`.

import React, { CSSProperties, FC, ReactNode, useState } from 'react';
import { resolveImgUrl } from '../types/Monster';
import { ImageVariant, imageSources, useImageManifest } from './images';

type Props = {
  url: string;
  variant: ImageVariant;
  alt: string;
  style?: CSSProperties;
  fallback?: ReactNode;
};

const ArtImage: FC<Props> = (props) => <ArtImageInner key={props.url} {...props} />;

// Keyed by URL so a new image starts over from the built copies.
const ArtImageInner: FC<Props> = ({ url, variant, alt, style, fallback = null }) => {
  const manifest = useImageManifest();
  const [stage, setStage] = useState<'built' | 'original' | 'failed'>('built');
  if (!manifest) return null;
  const sources = imageSources(url, variant, manifest);
  if (stage === 'failed') return <>{fallback}</>;

  const img = (src: string) => (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      style={style}
      onError={() => setStage(stage === 'built' && sources.jxl ? 'original' : 'failed')}
    />
  );
  if (stage === 'original') return img(resolveImgUrl(url));
  if (!sources.jxl) return img(sources.src);
  return (
    <picture style={{ display: 'contents' }}>
      <source srcSet={sources.jxl} type="image/jxl" />
      <source srcSet={sources.webp} type="image/webp" />
      {img(sources.src)}
    </picture>
  );
};

export default ArtImage;
