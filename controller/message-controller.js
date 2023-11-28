import Message from "../model/Message.js";
import Conversation from "../model/Conversation.js";

export const newMessage = async (request, response) => {
  const { text, conversationId, senderId, forwardToRecipientId, receiverId } = request.body;

  try {
    // Check if forwardToRecipientId is the same as senderId
    if (forwardToRecipientId === senderId) {
      return response.status(400).json({ error: "Cannot forward a message to yourself" });
    }

    const newMessage = new Message({ text, conversationId, senderId, forwardToRecipientId, receiverId });

    // Check if it's a forwarded message
    if (forwardToRecipientId) {
      // Check if the conversation already exists bidirectionally
      const forwardedConversation = await Conversation.findOne({
        $or: [
          { participants: [senderId, forwardToRecipientId] },
          { participants: [forwardToRecipientId, senderId] },
        ],
      });

      if (!forwardedConversation) {
        // If the conversation does not exist, create a new one
        const newConversation = new Conversation({
          participants: [senderId, forwardToRecipientId],
        });
        await newConversation.save();
        newMessage.conversationId = newConversation._id;
      } else {
        // If the conversation already exists, use its ID
        newMessage.conversationId = forwardedConversation._id;
      }
    }

    await newMessage.save();

    // Update the conversation with the latest message
    await Conversation.findByIdAndUpdate(newMessage.conversationId, {
      lastMessage: newMessage,
    });

    response.status(200).json("Message has been sent successfully");
  } catch (error) {
    response.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

export const getMessages = async (request, response) => {
  try {
    const messages = await Message.find({ conversationId: request.params.id });
    response.status(200).json(messages);
  } catch (error) {
    response.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};
