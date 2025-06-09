
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, AlertTriangle } from 'lucide-react';

interface Report {
  id: string;
  reason: string;
  description: string;
  evidence_screenshot: string;
  status: string;
  created_at: string;
  reporter_id: string;
  reported_user_id: string;
  profiles: {
    display_name: string;
    user_number: string;
  };
}

interface BanAppeal {
  id: string;
  appeal_reason: string;
  status: string;
  created_at: string;
  user_id: string;
  admin_response: string;
  profiles: {
    display_name: string;
    user_number: string;
  };
}

const AdminDashboardPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [appeals, setAppeals] = useState<BanAppeal[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedAppeal, setSelectedAppeal] = useState<BanAppeal | null>(null);
  const [banType, setBanType] = useState('');
  const [banReason, setBanReason] = useState('');
  const [appealResponse, setAppealResponse] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.is_admin) {
      fetchReports();
      fetchAppeals();
    }
  }, [profile]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select(`
          *,
          profiles!user_reports_reported_user_id_fkey (
            display_name,
            user_number
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchAppeals = async () => {
    try {
      const { data, error } = await supabase
        .from('ban_appeals')
        .select(`
          *,
          profiles (
            display_name,
            user_number
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppeals(data || []);
    } catch (error) {
      console.error('Error fetching appeals:', error);
    }
  };

  const banUser = async (userId: string, reportId: string) => {
    if (!banType || !banReason) {
      toast({
        title: "Missing information",
        description: "Please select ban type and provide reason",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let banEnd = null;
      const now = new Date();
      
      switch (banType) {
        case 'temp_24h':
          banEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'temp_7d':
          banEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'temp_1m':
          banEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        case 'temp_6m':
          banEnd = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
          break;
        case 'permanent':
          banEnd = null;
          break;
      }

      // Create ban record
      const { error: banError } = await supabase
        .from('user_bans')
        .insert({
          user_id: userId,
          banned_by: user?.id,
          reason: banReason,
          ban_type: banType,
          ban_end: banEnd?.toISOString()
        });

      if (banError) throw banError;

      // Update report status
      const { error: reportError } = await supabase
        .from('user_reports')
        .update({
          status: 'resolved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (reportError) throw reportError;

      toast({
        title: "User banned",
        description: "The user has been banned successfully",
      });

      setSelectedReport(null);
      setBanType('');
      setBanReason('');
      fetchReports();
    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const dismissReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('user_reports')
        .update({
          status: 'reviewed',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Report dismissed",
        description: "The report has been marked as reviewed",
      });

      setSelectedReport(null);
      fetchReports();
    } catch (error) {
      console.error('Error dismissing report:', error);
      toast({
        title: "Error",
        description: "Failed to dismiss report",
        variant: "destructive",
      });
    }
  };

  const respondToAppeal = async (appealId: string, approved: boolean) => {
    if (!appealResponse) {
      toast({
        title: "Missing response",
        description: "Please provide a response to the appeal",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('ban_appeals')
        .update({
          status: approved ? 'approved' : 'denied',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_response: appealResponse
        })
        .eq('id', appealId);

      if (error) throw error;

      if (approved && selectedAppeal) {
        // Deactivate the ban
        const { error: banError } = await supabase
          .from('user_bans')
          .update({ is_active: false })
          .eq('user_id', selectedAppeal.user_id)
          .eq('is_active', true);

        if (banError) throw banError;
      }

      toast({
        title: approved ? "Appeal approved" : "Appeal denied",
        description: `The ban appeal has been ${approved ? 'approved' : 'denied'}`,
      });

      setSelectedAppeal(null);
      setAppealResponse('');
      fetchAppeals();
    } catch (error) {
      console.error('Error responding to appeal:', error);
      toast({
        title: "Error",
        description: "Failed to respond to appeal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have admin privileges</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center">
            <Shield className="w-8 h-8 mr-3" />
            Admin Dashboard
          </h1>
        </div>

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList>
            <TabsTrigger value="reports" className="flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Reports ({reports.length})
            </TabsTrigger>
            <TabsTrigger value="appeals" className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Ban Appeals ({appeals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Reports</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                        selectedReport?.id === report.id ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedReport(report)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">
                          {report.profiles.display_name} (#{report.profiles.user_number})
                        </span>
                        <Badge variant="outline">{report.reason}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {report.description || 'No description provided'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No pending reports</p>
                  )}
                </CardContent>
              </Card>

              {selectedReport && (
                <Card>
                  <CardHeader>
                    <CardTitle>Report Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <strong>Reported User:</strong> {selectedReport.profiles.display_name}
                    </div>
                    <div>
                      <strong>Reason:</strong> {selectedReport.reason}
                    </div>
                    <div>
                      <strong>Description:</strong>
                      <p className="mt-1 text-gray-600">{selectedReport.description || 'None'}</p>
                    </div>
                    {selectedReport.evidence_screenshot && (
                      <div>
                        <strong>Evidence:</strong>
                        <img
                          src={selectedReport.evidence_screenshot}
                          alt="Evidence"
                          className="mt-2 max-w-full h-auto rounded border"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <Select value={banType} onValueChange={setBanType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ban duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="temp_24h">24 Hours</SelectItem>
                          <SelectItem value="temp_7d">7 Days</SelectItem>
                          <SelectItem value="temp_1m">1 Month</SelectItem>
                          <SelectItem value="temp_6m">6 Months</SelectItem>
                          <SelectItem value="permanent">Permanent</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Textarea
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="Ban reason..."
                      />
                      
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => banUser(selectedReport.reported_user_id, selectedReport.id)}
                          disabled={loading}
                          variant="destructive"
                        >
                          Ban User
                        </Button>
                        <Button
                          onClick={() => dismissReport(selectedReport.id)}
                          variant="outline"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="appeals">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Appeals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {appeals.map((appeal) => (
                    <div
                      key={appeal.id}
                      className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                        selectedAppeal?.id === appeal.id ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedAppeal(appeal)}
                    >
                      <div className="font-medium mb-2">
                        {appeal.profiles.display_name} (#{appeal.profiles.user_number})
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {appeal.appeal_reason}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(appeal.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {appeals.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No pending appeals</p>
                  )}
                </CardContent>
              </Card>

              {selectedAppeal && (
                <Card>
                  <CardHeader>
                    <CardTitle>Appeal Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <strong>User:</strong> {selectedAppeal.profiles.display_name}
                    </div>
                    <div>
                      <strong>Appeal Reason:</strong>
                      <p className="mt-1 text-gray-600">{selectedAppeal.appeal_reason}</p>
                    </div>
                    
                    <div className="space-y-3">
                      <Textarea
                        value={appealResponse}
                        onChange={(e) => setAppealResponse(e.target.value)}
                        placeholder="Admin response..."
                      />
                      
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => respondToAppeal(selectedAppeal.id, true)}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve Appeal
                        </Button>
                        <Button
                          onClick={() => respondToAppeal(selectedAppeal.id, false)}
                          disabled={loading}
                          variant="destructive"
                        >
                          Deny Appeal
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
