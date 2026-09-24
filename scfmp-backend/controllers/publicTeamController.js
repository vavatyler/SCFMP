const crypto = require('crypto');
const path = require('path');
const { TeamMember } = require('../models');
const { streamStoredTeamPhoto } = require('../services/teamPhotoStorageService');
const { UPLOAD_DIR } = require('../middleware/uploadMiddleware');

const publicPhotoSecret = () => (
  process.env.PUBLIC_PROFILE_TOKEN_SECRET
  || process.env.JWT_SECRET
  || 'development-public-profile-token'
);

const photoToken = (memberId) => crypto
  .createHmac('sha256', publicPhotoSecret())
  .update(`smartbridge-public-team-photo:${memberId}`)
  .digest('hex');

const hasStoredPhoto = (photoUrl = '') => (
  photoUrl.includes('.blob.vercel-storage.com/') || photoUrl.includes('/uploads/')
);

const profileForPublic = (member) => ({
  full_name: member.full_name,
  position: member.position,
  biography: member.biography,
  linkedin_url: member.linkedin_url,
  github_url: member.github_url,
  photo_url: member.photo_url
    ? (hasStoredPhoto(member.photo_url) ? `/api/public/team/photos/${photoToken(member.id)}` : member.photo_url)
    : null,
});

const visibleMembers = (attributes) => TeamMember.findAll({
  where: { status: 'active', profile_visibility: 'visible' },
  attributes,
  order: [['display_order', 'ASC'], ['full_name', 'ASC']],
});

const list = async (req, res) => {
  try {
    const members = await visibleMembers([
      'id',
      'full_name',
      'position',
      'biography',
      'photo_url',
      'linkedin_url',
      'github_url',
    ]);
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res.status(200).json({ success: true, data: members.map(profileForPublic) });
  } catch (error) {
    console.error('Public team profiles could not be loaded:', error);
    return res.status(503).json({ success: false, message: 'Team profiles are temporarily unavailable' });
  }
};

const safeTokenEquals = (provided, expected) => {
  if (!/^[a-f0-9]{64}$/i.test(provided || '')) return false;
  return crypto.timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'));
};

const photo = async (req, res) => {
  try {
    const members = await visibleMembers(['id', 'photo_url']);
    const member = members.find((candidate) => (
      candidate.photo_url
      && hasStoredPhoto(candidate.photo_url)
      && safeTokenEquals(req.params.token, photoToken(candidate.id))
    ));
    if (!member) return res.status(404).end();

    if (await streamStoredTeamPhoto(member.photo_url, res)) return undefined;

    const pathname = new URL(member.photo_url, 'http://localhost').pathname;
    return res.sendFile(path.join(UPLOAD_DIR, path.basename(pathname)), {
      headers: { 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    if (res.headersSent) return res.end();
    return res.status(404).end();
  }
};

module.exports = { list, photo };
