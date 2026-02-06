
import { apiService } from '../config/api'; // Ensure this points to your configured Axios/Fetch instance
import { Image } from 'react-native';

export const ArenaService = {
  
  /**
   * Fetch Exam Data (Generate)
   * GET /arena/generate/:lessonId
   */
  fetchExamSession: async (lessonId) => {
    try {
      console.log(`[ArenaService] Fetching exam for: ${lessonId}`);
      const response = await apiService.get(`/arena/generate/${lessonId}`);
      
      // Handle cases where apiService returns { data: ... } vs direct body
      const data = response.data || response;

      if (!data || !data.questions) {
          throw new Error("INVALID_DATA");
      }

      // Prefetch images for smoother experience
      const imagePromises = data.questions
          .filter(q => q.image)
          .map(q => {
              return Image.prefetch(q.image).catch(err => {
                  console.warn("[ArenaService] Failed to prefetch image:", q.image);
              });
          });

      await Promise.all(imagePromises);

      return data;

    } catch (error) {
      console.error("[ArenaService] Fetch Error:", error);
      throw error;
    }
  },

  /**
   * Submit Answers
   * POST /arena/submit
   * Payload: { lessonId, answers: [{questionId, answer}, ...] }
   */
  submitExam: async (payload) => {
    try {
        console.log("[ArenaService] Submitting exam...", payload);
        const response = await apiService.post('/arena/submit', payload);
        
        // Return the body directly
        return response.data || response;
    } catch (error) {
        console.error("[ArenaService] Submit Error:", error);
        throw error;
    }
  }
};