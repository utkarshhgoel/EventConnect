import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { EventPost, Application } from '@/types';
import { ArrowLeft, Star, CheckCircle } from 'lucide-react';

export default function Review() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventPost | null>(null);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState<Record<string, { rating: number, likert: number, description: string }>>({});

  useEffect(() => {
    if (id) {
      fetchEventAndCandidates();
    }
  }, [id]);

  const fetchEventAndCandidates = async () => {
    try {
      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch accepted applications
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select('*, candidate:profiles(*)')
        .eq('event_id', id)
        .eq('status', 'accepted');

      if (appsError) throw appsError;
      setApplicants(appsData || []);
      
      // Initialize reviews state
      const initialReviews: Record<string, { rating: number, likert: number, description: string }> = {};
      (appsData || []).forEach(app => {
        initialReviews[app.candidate_id] = { rating: 0, likert: 0, description: '' };
      });
      setReviews(initialReviews);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewChange = (candidateId: string, field: string, value: any) => {
    setReviews(prev => ({
      ...prev,
      [candidateId]: {
        ...prev[candidateId],
        [field]: value
      }
    }));
  };

  const handleSubmitReviews = async () => {
    if (!event) return;
    setSubmitting(true);
    try {
      // Prepare reviews data
      const reviewsData = Object.entries(reviews).map(([candidateId, review]: [string, any]) => ({
        event_id: event.id,
        organizer_id: event.organizer_id,
        candidate_id: candidateId,
        rating: review.rating,
        likert_scale: review.likert,
        description: review.description
      })).filter(r => r.rating > 0 && r.likert_scale > 0); // Only submit completed reviews

      if (reviewsData.length > 0) {
        const { error: reviewsError } = await supabase
          .from('reviews')
          .insert(reviewsData);
          
        if (reviewsError) {
          // If table doesn't exist, we'll just log it and proceed to close the event
          console.error('Error inserting reviews (table might not exist yet):', reviewsError);
        }
      }

      // Mark event as completed (we use 'closed' status but we can add a flag or just rely on reviews existing)
      // For now, we just navigate back to posts since status is already 'closed'
      navigate('/organizer/posts');
    } catch (error) {
      console.error('Error submitting reviews:', error);
      alert('Failed to submit reviews');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading candidates...</div>;
  if (!event) return <div className="p-12 text-center text-gray-500">Event not found</div>;

  return (
    <div className="max-w-3xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(`/organizer/posts/${event.id}`)}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Review Candidates</h1>
            <p className="text-sm text-gray-500">{event.title}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {applicants.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500">No candidates were selected for this event.</p>
            <button 
              onClick={() => navigate('/organizer/posts')}
              className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium"
            >
              Go to My Events
            </button>
          </div>
        ) : (
          <>
            <div className="bg-indigo-50 text-indigo-700 p-4 rounded-xl text-sm mb-6">
              Please review the performance of each selected candidate. These reviews will appear on their profile.
            </div>

            {applicants.map(app => (
              <div key={app.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
                    <img src={app.candidate?.avatar_url || `https://picsum.photos/seed/${app.candidate_id}/100`} alt="Avatar" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{app.candidate?.name || 'Candidate'}</h3>
                    <p className="text-sm text-gray-500 capitalize">{app.gender}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* 5-Star Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => handleReviewChange(app.candidate_id, 'rating', star)}
                          className={`p-1 transition-colors ${
                            (reviews[app.candidate_id]?.rating || 0) >= star 
                              ? 'text-yellow-400' 
                              : 'text-gray-300 hover:text-yellow-200'
                          }`}
                        >
                          <Star className="w-8 h-8 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Likert Scale */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Performance Satisfaction</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { val: 1, label: 'Poor' },
                        { val: 2, label: 'Fair' },
                        { val: 3, label: 'Good' },
                        { val: 4, label: 'Very Good' },
                        { val: 5, label: 'Excellent' }
                      ].map(item => (
                        <button
                          key={item.val}
                          onClick={() => handleReviewChange(app.candidate_id, 'likert', item.val)}
                          className={`py-2 px-1 text-xs font-medium rounded-lg border transition-all ${
                            reviews[app.candidate_id]?.likert === item.val
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Review Description</label>
                    <textarea
                      value={reviews[app.candidate_id]?.description || ''}
                      onChange={(e) => handleReviewChange(app.candidate_id, 'description', e.target.value)}
                      placeholder="Describe the candidate's performance..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none h-24 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={handleSubmitReviews}
              disabled={submitting}
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-gray-800 transition-colors flex items-center justify-center disabled:opacity-70"
            >
              {submitting ? 'Submitting Reviews...' : 'Submit All Reviews'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
