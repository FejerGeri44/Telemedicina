export interface Message {
  id: number;
  content: string;
  senderUserId: number;
  receiverUserId: number;
  sendDate: string;
  isReadDoctor: boolean;
  isReadPatient: boolean;
  isDeletedDoctor: boolean;
  isDeletedPatient: boolean;
}

export interface UnreadMessageData {
  id: number;
  partnerId: number;
  isRead_receiver: boolean;
  content: string;
  send_date: string;
  user: {
    id: number;
    name: string;
    role: string;
    pictureUrl: string;
  };
}
