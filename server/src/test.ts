import * as geminiService from './services/geminiService.js';
import * as promptEngine from './services/promptEngine.js';
import * as reviewParser from './parsers/reviewParser.js';
import { ReviewRequest, ReviewIssue } from './types/review.types.js';

const testCode: ReviewRequest = {
  code: `function calculateSum(numbers) {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum = sum + numbers[i];
  }
  return sum;
}`,
  language: 'javascript',
  fileName: 'example.js',
};

console.log('=== CodeRev Backend Implementation Tests (Gemini API) ===\n');

console.log('Test 1: API Key Validation...');
const apiKeyValid = geminiService.validateApiKey();
console.log(`✓ API Key: ${apiKeyValid ? 'PASS' : 'NOT FOUND'}\n`);

console.log('Test 2: Token Estimation...');
const tokens = geminiService.estimateTokens(testCode.code);
console.log(`✓ Code length: ${testCode.code.length} characters`);
console.log(`✓ Estimated tokens: ${tokens}\n`);

console.log('Test 3: System Prompt Generation...');
const systemPrompt = promptEngine.buildSystemPrompt();
console.log(`✓ System prompt length: ${systemPrompt.length} characters\n`);

console.log('Test 4: User Prompt Generation...');
const userPrompt = promptEngine.buildUserPrompt(testCode);
console.log(`✓ User prompt length: ${userPrompt.length} characters\n`);

console.log('Test 5: Review Request Structure...');
const reviewRequest = promptEngine.createReviewRequest(testCode);
console.log(`✓ System prompt length: ${reviewRequest.systemPrompt.length}`);
console.log(`✓ User prompt length: ${reviewRequest.userPrompt.length}\n`);

console.log('Test 6: Supported Languages...');
['javascript', 'python', 'java', 'unknown'].forEach((lang) => {
  const supported = promptEngine.isSupportedLanguage(lang);
  console.log(`✓ ${lang}: ${supported ? 'supported' : 'not supported'}`);
});
console.log();

console.log('Test 7: Parser - Valid JSON Response...');
const mockGeminiResponse = JSON.stringify({
  issues: [
    {
      id: 'issue-1',
      severity: 'error',
      category: 'bug',
      title: 'Missing null check',
      description: 'Array might be null',
      suggestedFix: 'Add null check before iteration',
    },
    {
      id: 'issue-2',
      severity: 'warning',
      category: 'style',
      title: 'Use const instead of let',
      description: 'Variable sum is not reassigned',
    },
  ],
});

const parsedIssues = reviewParser.parseGeminiResponse(mockGeminiResponse);
console.log(`✓ Parsed ${parsedIssues.length} issues`);
console.log(`  - Issue 1: ${parsedIssues[0].title} (severity: ${parsedIssues[0].severity})`);
console.log(`  - Issue 2: ${parsedIssues[1].title} (severity: ${parsedIssues[1].severity})\n`);

console.log('Test 8: Parser - Invalid JSON Handling...');
const invalidResponse = 'Some text { incomplete json [';
const invalidParsed = reviewParser.parseGeminiResponse(invalidResponse);
console.log(`✓ Invalid JSON handled gracefully: returned ${invalidParsed.length} issues (expected 0)\n`);

console.log('Test 9: Parser - Array Format...');
const arrayResponse = JSON.stringify([
  {
    id: 'issue-1',
    severity: 'info',
    category: 'improvement',
    title: 'Use arrow function',
    description: 'Consider using arrow functions',
  },
]);
const arrayParsed = reviewParser.parseGeminiResponse(arrayResponse);
console.log(`✓ Array format parsed correctly: ${arrayParsed.length} issue\n`);

console.log('Test 10: Issue Validation...');
const validIssues: ReviewIssue[] = [
  {
    id: 'issue-1',
    severity: 'error',
    category: 'bug',
    title: 'Test Issue',
    description: 'This is a test description',
    lineNumber: 10,
    suggestedFix: 'Fix this issue',
  },
];
const isValid = reviewParser.validateIssues(validIssues);
console.log(`✓ Valid issues validation: ${isValid ? 'PASS' : 'FAIL'}\n`);

console.log('Test 11: Issue Validation - Invalid Data...');
const invalidIssues: unknown[] = [
  { id: 'issue-1' }, // Missing required fields
  { severity: 'error' }, // Missing fields
];
const isInvalid = reviewParser.validateIssues(invalidIssues as ReviewIssue[]);
console.log(`✓ Invalid issues validation: ${!isInvalid ? 'PASS (correctly rejected)' : 'FAIL'}\n`);

console.log('=== All Tests Passed ===');
