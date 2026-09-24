import { useState } from 'react';
import { UserRound } from 'lucide-react';

const ProfileAvatar = ({ user, size = 'h-9 w-9' }) => {
  const [failed, setFailed] = useState(false);
  const photoUrl = user?.profile_photo_url;
  const hasImage = Boolean(photoUrl && !failed);
  const imageUrl = photoUrl && user?.team_profile_id
    && (photoUrl.includes('.blob.vercel-storage.com/') || photoUrl.includes('/uploads/'))
    ? `/api/team-members/${user.team_profile_id}/photo`
    : photoUrl;

  if (hasImage) {
    return <img src={imageUrl} alt={`${user?.first_name || ''} ${user?.last_name || ''}`.trim()} onError={() => setFailed(true)} className={`${size} shrink-0 rounded-full bg-sand object-cover`} />;
  }

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();
  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-forest/10 font-medium text-forest`} aria-label="Profile photo unavailable">
      {initials || <UserRound className="h-4 w-4" />}
    </span>
  );
};

export default ProfileAvatar;
