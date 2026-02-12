import { Question, BookOpen, CaretRight } from '@phosphor-icons/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function FAQ() {
    return (
        <div className="page-container max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-medium tracking-tight text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
                        FAQ & Guides
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Help center and documentation.</p>
                </div>
            </div>

            <div className="space-y-8">
                {/* Guides Section */}
                <section>
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        Quick Guides
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {['Getting Started', 'Managing Students', 'Creating Tests', 'Analyzing Results'].map((guide, i) => (
                            <div key={i} className="neo-card hover:border-primary/50 cursor-pointer group transition-colors">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{guide}</span>
                                    <CaretRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">Learn the basics of {guide.toLowerCase()}.</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* FAQ Section */}
                <section>
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
                        <Question className="h-5 w-5 text-muted-foreground" />
                        Frequently Asked Questions
                    </h2>
                    <div className="neo-card">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>How do I reset a student's password?</AccordionTrigger>
                                <AccordionContent>
                                    Navigate to the Users page, find the student, and click the actions menu to select "Reset Password".
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger>Can I export test results?</AccordionTrigger>
                                <AccordionContent>
                                    Yes, go to the Results page and click the "Export CSV" button at the top right corner.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                                <AccordionTrigger>How are grades calculated?</AccordionTrigger>
                                <AccordionContent>
                                    Grades are calculated based on the weighting of MCQ and Coding questions defined in the test settings.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </section>
            </div>

            <div className="mt-12 p-6 rounded-lg bg-muted/30 border border-border border-dashed text-center">
                <p className="text-muted-foreground">More content coming soon.</p>
            </div>
        </div>
    );
}
