
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload } from 'lucide-react';

const ReportUserPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportedUserId = searchParams.get('userId');
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const reportReasons = [
    'Harassment or bullying',
    'Inappropriate content',
    'Spam or scam',
    'Hate speech',
    'Violence or threats',
    'Impersonation',
    'Other'
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      setEvidenceFile(file);
    }
  };

  const submitReport = async () => {
    if (!reason || !reportedUserId || !user) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let evidenceUrl = null;

      // Upload evidence file if provided
      if (evidenceFile) {
        const fileExt = evidenceFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(fileName, evidenceFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          const { data } = supabase.storage
            .from('evidence')
            .getPublicUrl(fileName);
          evidenceUrl = data.publicUrl;
        }
      }

      // Submit report
      const { error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: reportedUserId,
          reason,
          description,
          evidence_screenshot: evidenceUrl
        });

      if (error) throw error;

      toast({
        title: "Report submitted",
        description: "Thank you for your report. We'll review it shortly.",
      });

      navigate(-1);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Reason for report *
              </label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {reportReasons.map((reasonOption) => (
                    <SelectItem key={reasonOption} value={reasonOption}>
                      {reasonOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Additional details
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide more details about what happened..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Evidence (screenshot)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="evidence-upload"
                />
                <label htmlFor="evidence-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {evidenceFile ? evidenceFile.name : 'Click to upload screenshot'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG up to 5MB
                  </p>
                </label>
              </div>
            </div>

            <Button
              onClick={submitReport}
              disabled={loading || !reason}
              className="w-full"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportUserPage;
