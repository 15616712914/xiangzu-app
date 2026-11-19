import { View, Image } from '@tarojs/components'

/**
 * Taro's H5 web-component image does not hydrate in this build, so H5 previews
 * draw the same source as a background. Mini program keeps the native Image.
 */
export function AppImage({
  src,
  mode = 'aspectFit',
  className,
  style,
}: {
  src: string
  mode?: 'aspectFit' | 'aspectFill' | 'scaleToFill' | 'widthFix'
  className?: string
  style?: React.CSSProperties
}) {
  if (process.env.TARO_ENV === 'h5') {
    return (
      <View
        className={className}
        style={{
          ...style,
          backgroundImage: `url("${src}")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: mode === 'aspectFit' ? 'contain' : 'cover',
        }}
      />
    )
  }
  return <Image src={src} mode={mode} className={className} style={style} />
}
