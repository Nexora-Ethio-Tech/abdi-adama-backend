import { useStore } from '../context/useStore';
import { useState } from 'react';
import { Megaphone, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const WebsitePosts = () => {
  const { t } = useTranslation();
  const { publicPosts, addPublicPost, deletePublicPost } = useStore();
  const [showPostModal, setShowPostModal] = useState(false);

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
              <Megaphone size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{t('websitePosts.title')}</h3>
              <p className="text-xs text-slate-500">{t('websitePosts.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowPostModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
          >
            <Plus size={16} />
            <span className="hidden xs:inline">{t('websitePosts.addPost')}</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {publicPosts.length === 0 ? (
            <div className="p-12 col-span-full text-center text-slate-500 text-sm">
              <Megaphone size={40} className="mx-auto text-slate-300 mb-4" />
              {t('websitePosts.noPosts')}
            </div>
          ) : (
            publicPosts.map((post) => (
              <div key={post.id} className="p-4 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
                    {post.type}
                  </span>
                  <button 
                    onClick={() => deletePublicPost(post.id)}
                    className="text-rose-500 hover:text-rose-600 text-xs font-bold uppercase"
                  >
                    {t('websitePosts.delete')}
                  </button>
                </div>
                <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 overflow-hidden shadow-inner">
                  {post.type === 'image' ? (
                    <img src={post.mediaUrl} alt="Post media" className="w-full h-full object-cover" />
                  ) : (
                    <iframe src={post.mediaUrl} className="w-full h-full pointer-events-none" />
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {post.description}
                </p>
                <div className="mt-auto pt-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                     {new Date(post.timestamp).toLocaleDateString()}
                   </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showPostModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">{t('websitePosts.addModalTitle')}</h3>
              <button onClick={() => setShowPostModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addPublicPost({
                type: formData.get('type') as 'image' | 'video',
                mediaUrl: formData.get('mediaUrl') as string,
                description: formData.get('description') as string,
              });
              setShowPostModal(false);
            }}>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{t('websitePosts.mediaType')}</label>
                <select name="type" required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all">
                  <option value="image">{t('websitePosts.imageType')}</option>
                  <option value="video">{t('websitePosts.videoType')}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{t('websitePosts.mediaUrl')}</label>
                <input name="mediaUrl" required type="url" placeholder="https://example.com/image.jpg" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{t('websitePosts.description')}</label>
                <textarea name="description" required rows={3} placeholder={t('websitePosts.placeholderDesc')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all" />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-purple-200 dark:shadow-none flex items-center justify-center gap-2">
                  <Megaphone size={18} />
                  <span>{t('websitePosts.publish')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
