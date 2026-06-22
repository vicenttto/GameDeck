type AvatarProps = {
  url?: string | null;
  username: string;
  imgClassName?: string;
  fallbackClassName?: string;
};

export default function Avatar({ url, username, imgClassName, fallbackClassName }: AvatarProps) {
  if (url) return <img src={url} alt={username} className={imgClassName} />;
  return <span className={fallbackClassName}>{username.slice(0, 2).toUpperCase()}</span>;
}
