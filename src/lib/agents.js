// Agent SDK stub
// This is a placeholder implementation for the AI Assistant feature
// Replace with actual agent SDK integration when available

export const agentSDK = {
  listConversations: ({ agent_name }) => {
    // Return empty list for now
    return [];
  },

  createConversation: ({ agent_name, metadata }) => {
    // Create a basic conversation object
    return {
      id: `conv_${Date.now()}`,
      agent_name,
      metadata,
      messages: [],
      created_at: new Date().toISOString()
    };
  },

  subscribeToConversation: (conversationId, callback) => {
    // Return unsubscribe function
    return () => {};
  },

  addMessage: async (conversation, message) => {
    // Placeholder - would normally send to agent API
    console.log('Message to agent:', message);
    // Add message to conversation
    if (!conversation.messages) {
      conversation.messages = [];
    }
    conversation.messages.push(message);

    // Simulate bot response
    setTimeout(() => {
      conversation.messages.push({
        role: 'assistant',
        content: 'AI Assistant is not yet configured. Please integrate with your agent service.'
      });
    }, 500);
  }
};
