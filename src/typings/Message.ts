import type { PrivateFriendMessage, PrivateGroupMessage, GroupMessage, MessageType, SendMessageSegment } from 'node-napcat-ts'

export type Message = PrivateFriendMessage | PrivateGroupMessage | GroupMessage

export type QuotedMessage = ({
  message_type: "private";
  sender: {
    user_id: number;
    nickname: string;
    card: string;
  };
  sub_type: "friend";
} | {
  message_type: "group";
  group_id: number;
  sender: {
    user_id: number;
    nickname: string;
    card: string;
    role: "owner" | "admin" | "member";
  };
  sub_type: "normal";
}) & {
  self_id: number;
  user_id: number;
  time: number;
  message_id: number;
  message_seq: number;
  real_id: number;
  raw_message: string;
  font: number;
  post_type: "message" | "message_sent";
} & MessageType

export type EnhancedMessage = Message & {
  reply: (reply: SendMessageSegment[]) => Promise<{ message_id: number }>,
  getQuoteMessage: () => Promise<QuotedMessage | undefined>
}