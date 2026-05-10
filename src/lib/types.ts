export type LeadStatus =
  | "新线索"
  | "已添加微信"
  | "已初次沟通"
  | "已发课程介绍"
  | "已预约试听"
  | "已试听"
  | "已报价"
  | "已报名"
  | "已缴费"
  | "已分班"
  | "服务中"
  | "已合格"
  | "已流失";

export type CustomerLevel = "A" | "B" | "C" | "D";

export type FollowUpMethod = "微信" | "电话" | "语音" | "视频" | "面谈";

export type PaymentStatus = "未付款" | "部分付款" | "已付款" | "已退款";

export type PaymentMethod = "微信" | "支付宝" | "银行转账" | "现金" | "分期";

export type TargetTrack = "学部" | "大学院" | "美术" | "就职" | "日语" | "其他";

export type CourseType =
  | "学部"
  | "大学院"
  | "美术"
  | "EJU"
  | "日语"
  | "面试"
  | "志望理由书";

export type TaskType =
  | "今日待跟进"
  | "逾期未跟进"
  | "试听提醒"
  | "报价后未回复提醒"
  | "缴费提醒"
  | "分班提醒"
  | "材料提交提醒"
  | "考试日期提醒"
  | "志望理由书截止提醒"
  | "面试练习提醒";

export type Role =
  | "超级管理员"
  | "校区负责人"
  | "销售顾问"
  | "市场人员"
  | "教务"
  | "进学指导"
  | "财务";

export type Campus = {
  id: string;
  name: string;
  city: string;
};

export type Channel = {
  id: string;
  name: string;
};

export type CRMUser = {
  id: string;
  name: string;
  role: Role;
  campusId: string;
  active: boolean;
  channelIds?: string[];
};

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type Lead = {
  id: string;
  studentName: string;
  wechat?: string;
  phone?: string;
  email?: string;
  locationCountry: "中国" | "日本";
  locationCity?: string;
  currentSchool?: string;
  currentGrade?: string;
  targetTrack: TargetTrack;
  targetYear?: number;
  targetSchool?: string;
  targetMajor?: string;
  japaneseLevel?: string;
  englishLevel?: string;
  ejuScore?: string;
  toeflToeicScore?: string;
  budget?: number;
  channelId: string;
  campusId: string;
  ownerId: string;
  customerLevel: CustomerLevel;
  status: LeadStatus;
  tagIds: string[];
  notes?: string;
  nextFollowUpAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type FollowUp = {
  id: string;
  leadId: string;
  followUpAt: string;
  method: FollowUpMethod;
  content: string;
  feedback?: string;
  nextAction?: string;
  nextFollowUpAt?: string;
  operatorId: string;
  levelChangeFrom?: CustomerLevel;
  levelChangeTo?: CustomerLevel;
  statusChangeFrom?: LeadStatus;
  statusChangeTo?: LeadStatus;
  createdAt: string;
};

export type Enrollment = {
  id: string;
  leadId: string;
  courseName: string;
  courseType: CourseType;
  listPrice: number;
  discountAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  enrolledAt: string;
  serviceStartDate?: string;
  serviceEndDate?: string;
  academicAdminId?: string;
  teacherId?: string;
  campusId: string;
};

export type Payment = {
  id: string;
  enrollmentId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  note?: string;
};

export type Handoff = {
  id: string;
  leadId: string;
  enrollmentId?: string;
  studyGoal?: string;
  targetSchool?: string;
  currentLevel?: string;
  salesPromises?: string;
  specialNotes?: string;
  coursesToArrange?: string;
  academicAdminId?: string;
  classAssignmentStatus: "未分班" | "已分班";
  confirmStatus: "未确认" | "已确认";
  createdAt: string;
  updatedAt: string;
};

export type CRMTask = {
  id: string;
  leadId?: string;
  assigneeId: string;
  type: TaskType;
  title: string;
  status: "待处理" | "已完成";
  dueAt?: string;
  doneAt?: string;
  createdAt: string;
};

export type AdmissionResult = {
  id: string;
  leadId: string;
  school: string;
  major?: string;
  level: "本科" | "修士" | "博士" | "专门" | "就职";
  isFirstChoice: boolean;
  canMarketing: boolean;
  admittedAt: string;
  consultantId?: string;
  teacherId?: string;
  marketingAssetStatus: "未整理" | "已整理" | "已发布";
};
