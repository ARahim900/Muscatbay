// Stub implementation for integrations - ready for custom service integration
// Each integration provides console warnings to indicate where custom implementation is needed

const createIntegrationStub = (integrationName) => async (...args) => {
  console.warn(`${integrationName}() called - implement custom integration`);
  return { success: false, message: 'Integration not implemented' };
};

export const Core = {
  InvokeLLM: createIntegrationStub('InvokeLLM'),
  SendEmail: createIntegrationStub('SendEmail'),
  UploadFile: createIntegrationStub('UploadFile'),
  GenerateImage: createIntegrationStub('GenerateImage'),
  ExtractDataFromUploadedFile: createIntegrationStub('ExtractDataFromUploadedFile'),
  CreateFileSignedUrl: createIntegrationStub('CreateFileSignedUrl'),
  UploadPrivateFile: createIntegrationStub('UploadPrivateFile')
};

export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
export const CreateFileSignedUrl = Core.CreateFileSignedUrl;
export const UploadPrivateFile = Core.UploadPrivateFile;






